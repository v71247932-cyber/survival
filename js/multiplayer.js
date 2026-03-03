// js/multiplayer.js — Multiplayer networking module
import { io } from 'socket.io-client';
import * as THREE from 'three';

export class Multiplayer {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.otherPlayers = {}; // id -> { name, mesh, ... }
        this.playersGroup = new THREE.Group();
        this.game.scene.add(this.playersGroup);
        this.isConnected = false;
    }

    connect(serverUrl = 'http://localhost:3000') {
        const playerName = document.getElementById('playerName')?.value || 'Player_' + Math.floor(Math.random() * 999);

        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.socket.emit('join', {
                name: playerName,
                pos: this.game.player?.getPosition() || { x: 0, y: 0, z: 0 },
                rot: this.game.player?.yaw?.rotation?.y || 0
            });
            this.game.ui?.notify('🌐 Connected to server as ' + playerName, 'info');
        });

        this.socket.on('init', (data) => {
            // Spawn existing players
            Object.values(data.players).forEach(p => {
                if (p.id !== this.socket.id) this._spawnOther(p);
            });
            // Init world state if needed
            if (data.world && this.game.weather) {
                this.game.weather.time = data.world.time;
                this.game.weather.day = data.world.day;
            }
        });

        this.socket.on('player_join', (data) => {
            if (data.id !== this.socket.id) {
                this._spawnOther(data);
                this.game.ui?.notify(`👤 ${data.name} joined the game`, 'info');
            }
        });

        this.socket.on('player_move', (data) => {
            const op = this.otherPlayers[data.id];
            if (op) {
                op.mesh.position.lerp(new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z), 0.5);
                op.mesh.rotation.y = data.rot;
            }
        });

        this.socket.on('player_leave', (id) => {
            const op = this.otherPlayers[id];
            if (op) {
                this.playersGroup.remove(op.mesh);
                delete this.otherPlayers[id];
                this.game.ui?.notify('👤 A player left the game');
            }
        });

        this.socket.on('world_sync', (data) => {
            if (this.game.weather) {
                // Smoothly sync time (if far off)
                if (Math.abs(this.game.weather.time - data.time) > 0.5) {
                    this.game.weather.time = data.time;
                    this.game.weather.day = data.day;
                }
            }
        });

        this.socket.on('player_action', (data) => {
            // Handle remote actions (building visuals)
            if (data.type === 'build' && this.game.world) {
                this.game.world.placePiece(data.payload.piece, data.payload.pos, data.payload.rot, data.payload.color);
            }
        });
    }

    _spawnOther(data) {
        const group = new THREE.Group();

        // Simple human mesh
        const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
            new THREE.MeshLambertMaterial({ color: 0x3b82f6 })
        );
        body.position.y = 0.9;

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshLambertMaterial({ color: 0xffdbac })
        );
        head.position.y = 1.6;

        group.add(body, head);
        group.position.set(data.pos.x, data.pos.y, data.pos.z);
        group.rotation.y = data.rot;

        this.playersGroup.add(group);
        this.otherPlayers[data.id] = { ...data, mesh: group };
    }

    sendMove(pos, rot) {
        if (!this.isConnected) return;
        this.socket.emit('move', { pos, rot });
    }

    sendAction(type, payload) {
        if (!this.isConnected) return;
        this.socket.emit('action', { type, payload });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.isConnected = false;
        }
    }
}
