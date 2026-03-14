import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.end('Server is running');
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
    // Parse realm from URL query: ws://host:port?realm=name
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const realm = url.searchParams.get('realm') || 'default';

    // Detect IP
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

    console.log(`[Server] Client connected: ${clientId} (${playerState.username}) from IP: ${ip} to Realm: ${realm}`);

    // Send the client their own ID
    ws.send(JSON.stringify({
        type: 'init',
        id: clientId,
        username: playerState.username
    }));

    // Send the new client a list of all existing clients IN THE SAME REALM
    const existingPlayers = Array.from(clients.values()).filter(p => p.id !== clientId && p.realm === realm);
    ws.send(JSON.stringify({
        type: 'player_list',
        players: existingPlayers
    }));

    // Broadcast announcement to everyone else IN THE SAME REALM
    broadcast(realm, {
        type: 'chat',
        id: 'server',
        username: 'Server',
        message: `Player ${playerState.username} connected`
    });

    // Broadcast to everyone else IN THE SAME REALM that a new player joined
    broadcast(realm, {
        type: 'player_join',
        player: playerState
    }, ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            handleClientMessage(ws, playerState, data);
        } catch (e) {
            console.error(`[Server] Failed to parse message from ${clientId}:`, e);
        }
    });

    ws.on('close', () => {
        console.log(`[Server] Client disconnected: ${clientId}`);
        clients.delete(ws);
        broadcast(realm, {
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
            if (data.username && typeof data.username === 'string' && data.username.trim() !== '') {
                state.username = data.username.trim().substring(0, 16);
                broadcast(realm, {
                    type: 'chat',
                    id: 'server',
                    username: 'Server',
                    message: `${state.id} changed name to ${state.username}`
                });
                broadcast(realm, {
                    type: 'player_join',
                    player: state
                });
            }
            break;
        case 'block_update':
            broadcast(realm, {
                type: 'block_update',
                id: state.id,
                x: data.x,
                y: data.y,
                z: data.z,
                blockType: data.blockType
            }, ws);
            break;
        case 'mob_spawn':
            broadcast(realm, {
                type: 'mob_spawn',
                id: data.id,
                isHostile: data.isHostile,
                position: data.position
            }, ws);
            break;
        case 'mob_move':
            broadcast(realm, {
                type: 'mob_move',
                id: data.id,
                position: data.position
            }, ws);
            break;
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            console.log(`[Server] Unknown message type: ${data.type}`);
    }
}

function broadcast(realm: string, data: any, excludeWs?: WebSocket) {
    const message = JSON.stringify(data);
    for (const [ws, state] of clients.entries()) {
        if (state.realm === realm && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    }
}

// Fixed tick loop for sending batched updates if needed (e.g. 20 TPS)
// For this tutorial prototype, direct broadcasting on 'move' is okay for low player counts.
// setInterval(() => {
//     const positions = Array.from(clients.values()).map(p => ({ id: p.id, pos: p.position, rot: p.rotation }));
//     broadcast({ type: 'world_state', players: positions });
// }, 50);

server.listen(Number(port), '0.0.0.0', () => {
    console.log(`[Server] WebSocket server listening on port ${port}`);
});
