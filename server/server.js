const { WebSocketServer } = require('ws');
const http = require('http');

const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    const origin = req.headers.origin || '*';
    const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true'
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    console.log(`[HTTP] ${req.method} ${req.url}`);
    res.writeHead(200, { ...headers, 'Content-Type': 'text/plain' });
    res.end('Voxel Server Online');
});

const wss = new WebSocketServer({ server });

let nextClientId = 1;
const clients = new Map();

wss.on('connection', (ws, req) => {
    const clientId = `p${nextClientId++}`;
    const state = { id: clientId, username: 'Guest', position: { x: 0, y: 80, z: 0 }, rotation: { y: 0 }, realm: 'default' };
    clients.set(ws, state);

    console.log(`[WS] Connected: ${clientId}`);
    ws.send(JSON.stringify({ type: 'init', id: clientId }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'set_username') {
                state.realm = data.realm || 'default';
                state.username = (data.username || 'Guest').substring(0, 16);
                const others = Array.from(clients.values()).filter(p => p.id !== clientId && p.realm === state.realm);
                ws.send(JSON.stringify({ type: 'player_list', players: others }));
                broadcast(state.realm, { type: 'player_join', player: state }, ws);
                return;
            }
            if (data.type === 'move') {
                state.position = data.position;
                state.rotation = data.rotation;
                broadcast(state.realm, { type: 'player_move', id: clientId, position: data.position, rotation: data.rotation }, ws);
                return;
            }
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                return;
            }
            broadcast(state.realm, data, ws);
        } catch (e) { }
    });

    ws.on('close', () => {
        clients.delete(ws);
        broadcast(state.realm, { type: 'player_leave', id: clientId });
    });
});

function broadcast(realm, data, excludeWs) {
    const msg = JSON.stringify(data);
    for (const [ws, state] of clients.entries()) {
        if (state.realm === realm && ws !== excludeWs && ws.readyState === 1) {
            ws.send(msg);
        }
    }
}

server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on ${port}`);
});
