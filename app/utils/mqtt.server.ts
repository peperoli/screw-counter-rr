// src/server.ts
import express from 'express'
import cors from 'cors'
import mqtt, { MqttClient } from 'mqtt'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = http.createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
})

// ---------- MQTT CONNECTION ----------
const mqttUrl = process.env.MQTT_URL!
const mqttOptions = {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  keepalive: 60,
  reconnectPeriod: 1000,
}

const client: MqttClient = mqtt.connect(mqttUrl, mqttOptions)

client.on('connect', () => {
  console.log('✅ MQTT connected')

  // Example static subscription – you can expose an API to change this at runtime
  client.subscribe('sensors/#', { qos: 0 }, err => {
    if (err) console.error('Subscribe error:', err)
    else console.log('Subscribed to sensors/#')
  })
})

client.on('error', err => console.error('❌ MQTT error:', err))
client.on('close', () => console.warn('🔌 MQTT disconnected'))

// Forward every MQTT message to all connected socket.io clients
client.on('message', (topic, payload) => {
  const message = {
    topic,
    payload: payload.toString(),
    timestamp: new Date().toISOString(),
  }
  io.emit('mqtt-message', message) // broadcast
})

// ---------- SOCKET.IO ----------
io.on('connection', socket => {
  console.log('🔗 New WS client:', socket.id)

  // Optional: allow the front‑end to request a manual subscription
  socket.on('subscribe', (topic: string) => {
    client.subscribe(topic, err => {
      if (err) socket.emit('error', `Subscribe failed: ${err.message}`)
      else socket.emit('subscribed', topic)
    })
  })

  socket.on('unsubscribe', (topic: string) => {
    client.unsubscribe(topic, err => {
      if (err) socket.emit('error', `Unsubscribe failed: ${err.message}`)
      else socket.emit('unsubscribed', topic)
    })
  })

  socket.on('disconnect', () => console.log('❎ WS client left:', socket.id))
})

// ---------- REST ENDPOINT TO PUBLISH ----------
app.post('/publish', (req, res) => {
  const { topic, message } = req.body
  if (!topic || typeof message === 'undefined')
    return res.status(400).json({ error: 'topic and message required' })

  client.publish(topic, String(message), { qos: 0 }, err => {
    if (err) {
      console.error('Publish error:', err)
      return res.status(500).json({ error: err.message })
    }
    res.json({ status: 'published', topic })
  })
})

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`🚀 HTTP + WS server listening on http://localhost:${PORT}`)
})
