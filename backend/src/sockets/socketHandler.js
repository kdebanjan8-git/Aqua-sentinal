import { Server } from 'socket.io';

let io = null;

export function initSocketServer(httpServer, corsOrigin = '*') {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to WebSocket [id=${socket.id}]`);

    socket.emit('connection:ack', {
      message: 'Connected to AquaSentinel Real-Time Outbreak Surveillance Gateway',
      timestamp: new Date().toISOString()
    });

    socket.on('subscribe:sensor', (sensorId) => {
      socket.join(`sensor:${sensorId}`);
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
}

export function broadcastToClients(event, data) {
  if (io) {
    io.emit(event, data);
  }
}
