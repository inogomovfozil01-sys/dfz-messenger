import express from 'express';
import http from 'http';
import fs from 'fs';
import { ENV } from './config';
import { APP_CONFIG } from '@dfz/config';
import { initWebSocketGateway } from './gateway/websocket.gateway';
import { app } from './app';

const server = http.createServer(app);

// Initialize WebSocket Gateway
const wsGateway = initWebSocketGateway(server);

// Ensure uploads folder exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

// Static uploads serving
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// Start Server
const PORT = ENV.PORT;
server.listen(PORT, () => {
  console.log(`🚀 ${APP_CONFIG.name} API & Gateway running on port ${PORT}`);
  console.log(`📡 WebSocket Gateway ready on ws://localhost:${PORT}`);
  console.log(`📂 Uploads directory: ${ENV.UPLOAD_DIR}`);
});

export { app, server, wsGateway };
