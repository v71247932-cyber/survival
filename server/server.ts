import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    // Robust CORS Headers - be extremely permissive for debugging
    const origin = req.headers.origin || '*';
    const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-cache'
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    // Handle ANY request to root or health as OK
    console.log(`[HTTP] Request: ${req.method} ${req.url} from ${origin}`);
    res.writeHead(200, { ...headers, 'Content-Type': 'text/plain' });
    res.end('Voxel Server is running - OK');
});

// Explicitly handle upgrade event for more control on Render
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
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0];
    const clientId = `player_${nextClientId++}`;

    // Default state, will be updated by first message
    const playerState: PlayerState = {
        id: clientId,
        username: `Guest_${clientId}`,
        position: { x: 0, y: 80, z: 0 },
        rotation: { y: 0 },
        realm: 'default'
    };

    clients.set(ws, playerState);
    console.log(`[WS] Client ${clientId} connected from ${ip}`);

    ws.send(JSON.stringify({
        type: 'init',
        id: clientId,
        username: playerState.username
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'set_username') {
                const oldRealm = playerState.realm;
                if (data.realm) playerState.realm = data.realm;
                if (data.username) playerState.username = data.username.trim().substring(0, 16);

                console.log(`[WS] Client ${clientId} joined realm: ${playerState.realm} as ${playerState.username}`);

                // Now send player list for this realm
                const existingPlayers = Array.from(clients.values()).filter(p => p.id !== clientId && p.realm === playerState.realm);
                ws.send(JSON.stringify({
                    type: 'player_list',
                    players: existingPlayers
                }));

                // Broadcast join to others in same realm
                broadcast(playerState.realm, { type: 'player_join', player: playerState }, ws);
                broadcast(playerState.realm, { type: 'chat', id: 'server', username: 'Server', message: `${playerState.username} joined` });
                return;
            }

            handleClientMessage(ws, playerState, data);
        } catch (e) {
            console.error(`[WS] Error handling message from ${clientId}`);
        }
    });

    ws.on('close', () => {
        console.log(`[WS] Client ${clientId} disconnected`);
        clients.delete(ws);
        broadcast(playerState.realm, { type: 'player_leave', id: clientId });
    });
});

function handleClientMessage(ws: WebSocket, state: PlayerState, data: any) {
    const realm = state.realm;
    switch (data.type) {
        case 'chat':
            broadcast(realm, { type: 'chat', id: state.id, username: state.username, message: data.message });
            break;
        case 'move':
            state.position = data.position;
            state.rotation = data.rotation;
            broadcast(realm, { type: 'player_move', id: state.id, position: state.position, rotation: state.rotation }, ws);
            break;
        case 'block_update':
            broadcast(realm, { type: 'block_update', id: state.id, x: data.x, y: data.y, z: data.z, blockType: data.blockType }, ws);
            break;
        case 'mob_spawn':
            broadcast(realm, { type: 'mob_spawn', ...data }, ws);
            break;
        case 'mob_move':
            broadcast(realm, { type: 'mob_move', ...data }, ws);
            break;
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
    }
}

function broadcast(realm: string, data: any, excludeWs?: WebSocket) {
    const msg = JSON.stringify(data);
    for (const [ws, state] of clients.entries()) {
        if (state.realm === realm && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
        }
    }
}

server.listen(Number(port), '0.0.0.0', () => {
    console.log(`[Voxel Server] Ready on port ${port}`);
});
