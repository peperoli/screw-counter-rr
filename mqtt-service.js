import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

class MQTTService {
  constructor(io) {
    this.io = io;
    this.client = null;
    this.isConnected = false;
    this.initialize();
  }

  initialize() {
    const mqttOptions = {
      username: process.env.MQTT_USER || 'screw-counter-web',
      password: process.env.MQTT_PASS || '8p2v3Wn3JIu4',
      keepalive: 60,
      reconnectPeriod: 1000,
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      clientId: `screw-counter-${Math.random().toString(16).substr(2, 8)}`
    };

    const mqttUrl = process.env.MQTT_URL || 'mqtts://761aa76a827b4185897045398392da71.s1.eu.hivemq.cloud:8883';

    console.log('Connecting to MQTT broker:', mqttUrl);
    this.client = mqtt.connect(mqttUrl, mqttOptions);

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('connect', () => {
      console.log('✅ MQTT connected successfully');
      this.isConnected = true;
      
      // Subscribe to default topics
      const defaultTopics = process.env.MQTT_DEFAULT_TOPICS?.split(',') || ['sensors/#', 'screw-counter/#'];
      
      defaultTopics.forEach(topic => {
        this.subscribe(topic.trim());
      });

      // Notify all connected clients about MQTT connection status
      this.io.emit('mqtt-status', { connected: true, message: 'MQTT connected' });
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT error:', err);
      this.isConnected = false;
      this.io.emit('mqtt-status', { connected: false, error: err.message });
    });

    this.client.on('close', () => {
      console.warn('🔌 MQTT connection closed');
      this.isConnected = false;
      this.io.emit('mqtt-status', { connected: false, message: 'MQTT disconnected' });
    });

    this.client.on('reconnect', () => {
      console.log('🔄 MQTT reconnecting...');
      this.io.emit('mqtt-status', { connected: false, message: 'MQTT reconnecting' });
    });

    // Forward MQTT messages to all connected Socket.IO clients
    this.client.on('message', (topic, payload) => {
      try {
        const message = {
          topic,
          payload: payload.toString(),
          timestamp: new Date().toISOString(),
        };
        
        console.log('📨 MQTT message received:', { topic, payload: payload.toString() });
        
        // Broadcast to all connected clients
        this.io.emit('mqtt-message', message);
      } catch (error) {
        console.error('Error processing MQTT message:', error);
      }
    });
  }

  subscribe(topic, qos = 0) {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot subscribe: MQTT client not connected');
      return Promise.reject(new Error('MQTT client not connected'));
    }

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, { qos }, (err) => {
        if (err) {
          console.error(`Subscribe error for topic ${topic}:`, err);
          reject(err);
        } else {
          console.log(`📡 Subscribed to MQTT topic: ${topic}`);
          resolve(topic);
        }
      });
    });
  }

  unsubscribe(topic) {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot unsubscribe: MQTT client not connected');
      return Promise.reject(new Error('MQTT client not connected'));
    }

    return new Promise((resolve, reject) => {
      this.client.unsubscribe(topic, (err) => {
        if (err) {
          console.error(`Unsubscribe error for topic ${topic}:`, err);
          reject(err);
        } else {
          console.log(`📡 Unsubscribed from MQTT topic: ${topic}`);
          resolve(topic);
        }
      });
    });
  }

  publish(topic, message, qos = 0) {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish: MQTT client not connected');
      return Promise.reject(new Error('MQTT client not connected'));
    }

    return new Promise((resolve, reject) => {
      this.client.publish(topic, String(message), { qos }, (err) => {
        if (err) {
          console.error(`Publish error for topic ${topic}:`, err);
          reject(err);
        } else {
          console.log(`📤 Published to MQTT topic ${topic}:`, message);
          resolve({ topic, message });
        }
      });
    });
  }

  setupSocketHandlers(socket) {
    // Allow clients to subscribe to specific topics
    socket.on('mqtt-subscribe', async (topic) => {
      try {
        await this.subscribe(topic);
        socket.emit('mqtt-subscribed', { topic, success: true });
      } catch (error) {
        socket.emit('mqtt-error', { action: 'subscribe', topic, error: error.message });
      }
    });

    // Allow clients to unsubscribe from topics
    socket.on('mqtt-unsubscribe', async (topic) => {
      try {
        await this.unsubscribe(topic);
        socket.emit('mqtt-unsubscribed', { topic, success: true });
      } catch (error) {
        socket.emit('mqtt-error', { action: 'unsubscribe', topic, error: error.message });
      }
    });

    // Allow clients to publish messages
    socket.on('mqtt-publish', async ({ topic, message, qos = 0 }) => {
      try {
        await this.publish(topic, message, qos);
        socket.emit('mqtt-published', { topic, message, success: true });
      } catch (error) {
        socket.emit('mqtt-error', { action: 'publish', topic, error: error.message });
      }
    });

    // Send current connection status to new clients
    socket.emit('mqtt-status', { 
      connected: this.isConnected, 
      message: this.isConnected ? 'MQTT connected' : 'MQTT not connected' 
    });
  }

  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.isConnected = false;
    }
  }
}

export default MQTTService;