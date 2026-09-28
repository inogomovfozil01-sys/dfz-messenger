import http from 'http';
import { app } from './app';
import { ENV } from './config';
import { initWebSocketGateway } from './gateway/websocket.gateway';
const server = http.createServer(app);
const wsGateway = initWebSocketGateway(server);
server.listen(ENV.PORT, () => console.log('DFZ API & WebSocket listening on port', ENV.PORT));
export { app, server, wsGateway };
