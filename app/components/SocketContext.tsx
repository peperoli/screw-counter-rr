import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface MqttMessage {
  topic: string;
  payload: string;
  timestamp: string;
}

interface MqttStatus {
  connected: boolean;
  message?: string;
  error?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  mqttStatus: MqttStatus;
  messages: MqttMessage[];
  subscribe: (topic: string) => Promise<void>;
  unsubscribe: (topic: string) => Promise<void>;
  publish: (topic: string, message: string, qos?: number) => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  mqttStatus: { connected: false },
  messages: [],
  subscribe: async () => {},
  unsubscribe: async () => {},
  publish: async () => {},
});

export const useSocket = () => useContext(SocketContext);

interface Props {
  children: ReactNode;
  serverUrl?: string;
}

export const SocketProvider: React.FC<Props> = ({ 
  children, 
  serverUrl = 'http://localhost:3000' 
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mqttStatus, setMqttStatus] = useState<MqttStatus>({ connected: false });
  const [messages, setMessages] = useState<MqttMessage[]>([]);

  useEffect(() => {
    const socketInstance = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    // Socket.IO connection events
    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❎ Socket.IO disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnected(false);
    });

    // MQTT-specific events
    socketInstance.on('mqtt-status', (status: MqttStatus) => {
      console.log('📡 MQTT status:', status);
      setMqttStatus(status);
    });

    socketInstance.on('mqtt-message', (message: MqttMessage) => {
      console.log('📨 MQTT message received:', message);
      setMessages((prev) => {
        // Keep only the last 100 messages to prevent memory issues
        const newMessages = [...prev, message];
        return newMessages.length > 100 ? newMessages.slice(-100) : newMessages;
      });
    });

    socketInstance.on('mqtt-subscribed', ({ topic, success }) => {
      console.log(`✅ Successfully subscribed to MQTT topic: ${topic}`);
    });

    socketInstance.on('mqtt-unsubscribed', ({ topic, success }) => {
      console.log(`✅ Successfully unsubscribed from MQTT topic: ${topic}`);
    });

    socketInstance.on('mqtt-published', ({ topic, message, success }) => {
      console.log(`✅ Successfully published to MQTT topic ${topic}:`, message);
    });

    socketInstance.on('mqtt-error', ({ action, topic, error }) => {
      console.error(`❌ MQTT ${action} error for topic ${topic}:`, error);
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [serverUrl]);

  const subscribe = async (topic: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Subscribe timeout'));
      }, 5000);

      socket.once('mqtt-subscribed', ({ topic: responseTopic, success }) => {
        clearTimeout(timeout);
        if (responseTopic === topic && success) {
          resolve();
        } else {
          reject(new Error('Subscribe failed'));
        }
      });

      socket.once('mqtt-error', ({ action, topic: responseTopic, error }) => {
        if (action === 'subscribe' && responseTopic === topic) {
          clearTimeout(timeout);
          reject(new Error(error));
        }
      });

      socket.emit('mqtt-subscribe', topic);
    });
  };

  const unsubscribe = async (topic: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Unsubscribe timeout'));
      }, 5000);

      socket.once('mqtt-unsubscribed', ({ topic: responseTopic, success }) => {
        clearTimeout(timeout);
        if (responseTopic === topic && success) {
          resolve();
        } else {
          reject(new Error('Unsubscribe failed'));
        }
      });

      socket.once('mqtt-error', ({ action, topic: responseTopic, error }) => {
        if (action === 'unsubscribe' && responseTopic === topic) {
          clearTimeout(timeout);
          reject(new Error(error));
        }
      });

      socket.emit('mqtt-unsubscribe', topic);
    });
  };

  const publish = async (topic: string, message: string, qos: number = 0): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Publish timeout'));
      }, 5000);

      socket.once('mqtt-published', ({ topic: responseTopic, success }) => {
        clearTimeout(timeout);
        if (responseTopic === topic && success) {
          resolve();
        } else {
          reject(new Error('Publish failed'));
        }
      });

      socket.once('mqtt-error', ({ action, topic: responseTopic, error }) => {
        if (action === 'publish' && responseTopic === topic) {
          clearTimeout(timeout);
          reject(new Error(error));
        }
      });

      socket.emit('mqtt-publish', { topic, message, qos });
    });
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    mqttStatus,
    messages,
    subscribe,
    unsubscribe,
    publish,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;