// server.js — Scalable Socket.io backend for WildEdge Multiplayer
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Serve static files from the root
app.use(express.static(__dirname));

const players = {};
const worldState = {
    time: 8.0,
    day: 1,
    weather: 'clear'
};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('join', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || 'Survivor',
            pos: data.pos || { x: 0, y: 0, z: 0 },
            rot: data.rot || 0,
            item: null
        };

        // Send current world state and all other players
        socket.emit('init', {
            players,
            world: worldState
        });

        // Notify others
        socket.broadcast.emit('player_join', players[socket.id]);
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].pos = data.pos;
            players[socket.id].rot = data.rot;
            socket.broadcast.emit('player_move', {
                id: socket.id,
                pos: data.pos,
                rot: data.rot
            });
        }
    });

    socket.on('action', (data) => {
        // Sync actions like building, gathering (visuals)
        socket.broadcast.emit('player_action', {
            id: socket.id,
            type: data.type,
            target: data.target,
            payload: data.payload
        });
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('player_leave', socket.id);
    });
});

// Time sync loop
setInterval(() => {
    worldState.time += 0.005; // Matches client weather system speed
    if (worldState.time >= 24) { worldState.time = 0; worldState.day++; }
    io.emit('world_sync', worldState);
}, 2000);

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`WildEdge Server running at http://localhost:${PORT}`);
});
