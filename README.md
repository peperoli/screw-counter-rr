# Screw Counter with React Router

A modern, production-ready screw counting application built with React Router, featuring real-time MQTT integration via Socket.IO.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- � **MQTT Integration** - Real-time message subscription and publishing
- 🔌 **Socket.IO** - WebSocket communication between client and server
- 🔢 **Real-time counting** - MQTT-driven screw counter functionality

## MQTT & Socket.IO Integration

This application integrates MQTT messaging with Socket.IO for real-time communication:

### Server-side Architecture
- **MQTT Service**: Connects to HiveMQ broker and manages subscriptions
- **Socket.IO Server**: Bridges MQTT messages to WebSocket clients
- **Environment Configuration**: Secure credential management via `.env`

### Client-side Architecture  
- **SocketContext**: React context for Socket.IO connection management
- **MqttContext**: Backward-compatible MQTT context using Socket.IO
- **Real-time Updates**: Automatic UI updates from MQTT messages

### MQTT Topics
- `count-target` - Set count target
- `current-count` - Get current count
- `reset` - Reset the counter to zero
- `success` - Success

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your MQTT broker credentials:
```env
MQTT_URL=mqtts://your-broker-url:8883
MQTT_USER=your-username
MQTT_PASS=your-password
MQTT_DEFAULT_TOPICS=sensors/#,screw-counter/#
```

### Development

Start the development server with HMR:

```bash
npm run dev
```bash
npm run dev
```

Your application will be available at `http://localhost:3000`.

**Connection Status**: Check the top-left corner for Socket.IO and MQTT connection indicators (🟢/🔴).

## Usage

### Manual Counter
- Click "Zähler starten" to begin counting
- Use "+ Manuell zählen" to increment manually
- MQTT messages on `screw-counter/increment` will auto-increment

### MQTT Integration
Send MQTT messages to control the counter:
```bash
# Increment counter
mosquitto_pub -h your-broker-url -t "screw-counter/increment" -m "1" -u username -P password

# Reset counter
mosquitto_pub -h your-broker-url -t "screw-counter/reset" -m "0" -u username -P password
```

### Client-side MQTT API
```typescript
import { useMqtt } from '~/components/MqttContext';

function MyComponent() {
  const { isConnected, mqttConnected, messages, subscribe, publish } = useMqtt();
  
  // Subscribe to a topic
  await subscribe('my/topic');
  
  // Publish a message
  await publish('my/topic', 'Hello MQTT!');
  
  // Access received messages
  console.log('Latest messages:', messages);
}
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Architecture Notes

### Dependencies
- `mqtt` - MQTT client for Node.js
- `socket.io` - WebSocket server
- `socket.io-client` - WebSocket client
- `dotenv` - Environment variable management

### File Structure
```
app/
  components/
    SocketContext.tsx    # Socket.IO React context
    MqttContext.tsx      # MQTT React context (Socket.IO based)
  routes/
    home.tsx            # Main counter interface with MQTT integration
mqtt-service.js         # MQTT service with Socket.IO bridge
dev-server.js          # Enhanced dev server with Socket.IO
.env                   # MQTT credentials (not in git)
.env.example          # Environment template
```

## Deployment

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fremix-run%2Freact-router-templates%2Ftree%2Fmain%2Fvercel&project-name=my-react-router-app&repository-name=my-react-router-app)

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
