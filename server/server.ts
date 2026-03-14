import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    // Robust CORS Headers
    const origin = req.headers.origin || '*';
    const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
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
        console.log(`[HTTP] Health check from ${req.socket.remoteAddress}`);
        res.writeHead(200, headers);
        res.end('Voxel Server is running - OK');
        return;
    }

    res.writeHead(404, headers);
    res.end('Not Found');
});

const wss = new WebSocketServer({ server });

interface PlayerState {
    id: string;
    username: string;
    position: { x: number, y: number, z: number };
    rotation: { y: number };
    realm: string;
    ip: string;
}

const clients = new Map<WebSocket, PlayerState>();
let nextClientId = 1;

wss.on('connection', (ws, req) => {
    // Handle realm from URL or default
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const realm = url.searchParams.get('realm') || 'default';
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0];

    const clientId = `player_${nextClientId++}`;
    const playerState: PlayerState = {
        id: clientId,
        username: `Guest_${Math.floor(Math.random() * 1000)}`,
        position: { x: 0, y: 100, z: 0 },
        rotation: { y: 0 },
        realm: realm,
        ip: ip
    };

    clients.set(ws, playerState);
    console.log(`[WS] Client ${clientId} connected to realm: ${realm} from ${ip}`);

    ws.send(JSON.stringify({
        type: 'init',
        id: clientId,
        username: playerState.username
    }));

    const existingPlayers = Array.from(clients.values()).filter(p => p.id !== clientId && p.realm === realm);
    ws.send(JSON.stringify({
        type: 'player_list',
        players: existingPlayers
    }));

    broadcast(realm, {
        type: 'chat',
        id: 'server',
        username: 'Server',
        message: `Player ${playerState.username} connected`
    });

    broadcast(realm, {
        type: 'player_join',
        player: playerState
    }, ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            handleClientMessage(ws, playerState, data);
        } catch (e) {
            console.error(`[WS] Parse error from ${clientId}`);
        }
    });

    ws.on('close', () => {
        console.log(`[WS] Client ${clientId} disconnected`);
        clients.delete(ws);
        broadcast(playerState.realm, {
            type: 'player_leave',
            id: clientId
        });
    });
});

function handleClientMessage(ws: WebSocket, state: PlayerState, data: any) {
    const realm = state.realm;
    switch (data.type) {
        case 'chat':
            broadcast(realm, {
                type: 'chat',
                id: state.id,
                username: state.username,
                message: data.message
            });
            break;
        case 'move':
            state.position = data.position;
            state.rotation = data.rotation;
            broadcast(realm, {
                type: 'player_move',
                id: state.id,
                position: state.position,
                rotation: state.rotation
            }, ws);
            break;
        case 'set_username':
            if (data.username && typeof data.username === 'string') {
                const oldName = state.username;
                state.username = data.username.trim().substring(0, 16) || oldName;
                broadcast(realm, {
                    type: 'chat',
                    id: 'server',
                    username: 'Server',
                    message: `${oldName} is now ${state.username}`
                });
            }
            break;
        case 'block_update':
            broadcast(realm, {
                type: 'block_update',
                id: state.id,
                x: data.x, y: data.y, z: data.z,
                blockType: data.blockType
            }, ws);
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
    console.log(`[Voxel Server] Listening on port ${port}`);
});
