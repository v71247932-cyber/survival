import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    const origin = req.headers.origin || '*';
    const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'text/plain'
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, headers);
        res.end('Voxel Server OK');
        return;
    }

    res.writeHead(200, headers);
    res.end('OK');
});

// Explicitly handle upgrade on any path for maximum flexibility
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    console.log(`[WS] Upgrade request for ${request.url}`);
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

interface PlayerState {
    id: string;
    username: string;
    position: { x: number, y: number, z: number };
    rotation: { y: number };
    realm: string;
}

const clients = new Map<WebSocket, PlayerState>();
let nextClientId = 1;

wss.on('connection', (ws, req) => {
    const clientId = `p${nextClientId++}`;
    const playerState: PlayerState = {
        id: clientId,
        username: `Guest`,
        position: { x: 0, y: 80, z: 0 },
        rotation: { y: 0 },
        realm: 'default'
    };

    clients.set(ws, playerState);

    ws.send(JSON.stringify({ type: 'init', id: clientId }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'set_username') {
                if (data.realm) playerState.realm = data.realm;
                if (data.username) playerState.username = data.username.trim().substring(0, 16);

                const others = Array.from(clients.values()).filter(p => p.id !== clientId && p.realm === playerState.realm);
                ws.send(JSON.stringify({ type: 'player_list', players: others }));
                broadcast(playerState.realm, { type: 'player_join', player: playerState }, ws);
                return;
            }
            if (data.type === 'move') {
                playerState.position = data.position;
                playerState.rotation = data.rotation;
                broadcast(playerState.realm, { type: 'player_move', id: clientId, position: data.position, rotation: data.rotation }, ws);
                return;
            }
            if (data.type === 'chat') {
                broadcast(playerState.realm, { type: 'chat', id: clientId, username: playerState.username, message: data.message });
                return;
            }
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                return;
            }
            // Pass-through for blocks and mobs
            broadcast(playerState.realm, data, ws);
        } catch (e) { }
    });

    ws.on('close', () => {
        clients.delete(ws);
        broadcast(playerState.realm, { type: 'player_leave', id: clientId });
    });
});

function broadcast(realm: string, data: any, excludeWs?: WebSocket) {
    const msg = JSON.stringify(data);
    for (const [ws, state] of clients.entries()) {
        if (state.realm === realm && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
        }
    }
}

server.listen(Number(port), '0.0.0.0', () => {
    console.log(`[Voxel Server] Port ${port}`);
});
