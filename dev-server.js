import { createRequestHandler } from "@react-router/express";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import MQTTService from "./mqtt-service.js";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize MQTT service
const mqttService = new MQTTService(io);

if (process.env.NODE_ENV === "production") {
  app.use(express.static("build/client"));
  app.use(
    createRequestHandler({
      build: await import("./build/server/index.js"),
    }),
  );
} else {
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    }),
  );
  app.use(viteDevServer.middlewares);
  app.use(
    createRequestHandler({
      build: () =>
        viteDevServer.ssrLoadModule(
          "virtual:react-router/server-build",
        ),
    }),
  );
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔗 Client connected:', socket.id);
  
  // Setup MQTT-specific socket handlers
  mqttService.setupSocketHandlers(socket);
  
  socket.on('disconnect', () => {
    console.log('❎ Client disconnected:', socket.id);
  });
});

httpServer.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
  console.log(`WebSocket server ready`);
});
