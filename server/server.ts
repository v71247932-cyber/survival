import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const port = process.env.PORT || 8080;
const server = http.createServer();
const wss = new WebSocketServer({ server });

interface PlayerState {
    id: string;
    username: string;
    position: { x: number, y: number, z: number };
    rotation: { y: number };
}

const clients = new Map < WebSocket, PlayerState> ();
let nextClientId = 1;

wss.on('connection', (ws) => {
    const clientId = `player_${nextClientId++}`;
    const playerState: PlayerState = {
        id: clientId,
        username: `Guest_${Math.floor(Math.random() * 1000)}`,
        position: { x: 0, y: 100, z: 0 },
        rotation: { y: 0 }
    };

    clients.set(ws, playerState);

    console.log(`[Server] Client connected: ${clientId} (${playerState.username})`);

    // Send the client their own ID
    ws.send(JSON.stringify({
        type: 'init',
        id: clientId,
        username: playerState.username
    }));

    // Send the new client a list of all existing clients
    const existingPlayers = Array.from(clients.values()).filter(p => p.id !== clientId);
    ws.send(JSON.stringify({
        type: 'player_list',
        players: existingPlayers
    }));

    // Broadcast to everyone else that a new player joined
    broadcast({
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
        broadcast({
            type: 'player_leave',
            id: clientId
        });
    });
});

function handleClientMessage(ws: WebSocket, state: PlayerState, data: any) {
    switch (data.type) {
        case 'chat':
            broadcast({
                type: 'chat',
                id: state.id,
                username: state.username,
                message: data.message
            });
            break;
        case 'move':
            state.position = data.position;
            state.rotation = data.rotation;
            // Send position updates frequently. In a larger game we might batch these at 20 ticks/sec
            broadcast({
                type: 'player_move',
                id: state.id,
                position: state.position,
                rotation: state.rotation
            }, ws);
            break;
        case 'set_username':
            if (data.username && typeof data.username === 'string' && data.username.trim() !== '') {
                state.username = data.username.trim().substring(0, 16);
                broadcast({
                    type: 'chat',
                    id: 'server',
                    username: 'Server',
                    message: `${state.id} changed name to ${state.username}`
                });
                // Broadcast updated player list or a specific rename event (re-using join for simplicity in this prototype)
                broadcast({
                    type: 'player_join', // Simplest way to update clients without a dedicated rename event in standard boilerplate
                    player: state
                });
            }
            break;
        case 'block_update':
            // data should contain { x, y, z, blockType }
            broadcast({
                type: 'block_update',
                id: state.id,
                x: data.x,
                y: data.y,
                z: data.z,
                blockType: data.blockType
            }, ws);
            break;
        default:
            console.log(`[Server] Unknown message type: ${data.type}`);
    }
}

function broadcast(data: any, excludeWs?: WebSocket) {
    const message = JSON.stringify(data);
    for (const [ws, _] of clients.entries()) {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
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

server.listen(port, () => {
    console.log(`[Server] WebSocket server listening on port ${port}`);
});
