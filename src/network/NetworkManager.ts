import * as THREE from 'three';
import { World } from '../world/World';
import { EntityManager } from '../entities/EntityManager';
import { Player } from '../entities/Player';

export class NetworkManager {
    public ws: WebSocket | null = null;
    public localPlayerId: string = '';
    public connected: boolean = false;
    public currentRealm: string = '';

    private world: World;
    private entityManager: EntityManager;
    private player: Player;
    private firstUpdate = true;

    private lastSentPos = new THREE.Vector3();
    private lastSentRotY = 0;
    private statusElement: HTMLElement | null = null;

    constructor(world: World, entityManager: EntityManager, player: Player) {
        this.world = world;
        this.entityManager = entityManager;
        this.player = player;
        this.statusElement = document.getElementById('performance-stats');

        window.addEventListener('local_mob_spawn', (e: any) => {
            const mob = e.detail;
            this.send({
                type: 'mob_spawn',
                id: (mob as any).id,
                isHostile: mob.isHostile,
                position: { x: mob.mesh.position.x, y: mob.mesh.position.y, z: mob.mesh.position.z }
            });
        });

        window.addEventListener('local_block_update', (e: any) => {
            const { x, y, z, type } = e.detail;
            this.send({
                type: 'block_update',
                x, y, z,
                blockType: type
            });
        });
    }

    private heartbeatInterval: any = null;

    public connect(ip: string, username: string, realm: string = '') {
        this.currentRealm = realm;
        if (this.ws) {
            this.ws.close();
        }

        let protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        if (ip.startsWith('ws://') || ip.startsWith('wss://')) {
            protocol = '';
        }

        let url = `${protocol}${ip}${ip.endsWith('/') ? '' : '/'}`;
        if (realm) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}realm=${encodeURIComponent(realm)}`;
        }
        console.log(`[Network] Connecting to ${url}...`);

        // Wake up Render server (cold start)
        const httpUrl = url.replace('ws://', 'http://').replace('wss://', 'https://').split('?')[0];
        fetch(httpUrl, { mode: 'no-cors' }).catch(() => { });

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[Network] Connected!');
                this.connected = true;
                if (this.statusElement) {
                    this.statusElement.style.color = '#55ff55';
                    this.statusElement.innerText = 'FPS: 0 [Online]';
                }

                // Send initial username
                this.send({
                    type: 'set_username',
                    username: username
                });

                // Start heartbeat to keep Render alive
                if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = setInterval(() => {
                    this.send({ type: 'ping' });
                }, 10000); // 10s heartbeat
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') return; // Silence heartbeat
                    this.handleMessage(data);
                } catch (e) {
                    console.error('[Network] Error parsing message:', e);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[Network] WebSocket error:', error);
                this.ws?.close();
            };

            this.ws.onclose = () => {
                console.log('[Network] Disconnected. Retrying in 30s...');
                this.connected = false;
                if (this.statusElement) {
                    this.statusElement.style.color = '#ff5555';
                    this.statusElement.innerText = 'FPS: 0 [Offline - Retrying]';
                }
                this.entityManager.clearRemotePlayers();
                if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

                // Retry connection
                setTimeout(() => {
                    if (!this.connected) {
                        this.connect(ip, username, realm);
                    }
                }, 30000); // 30s delay
            };
        } catch (e) {
            console.error('[Network] Failed to create WebSocket:', e);
        }
    }

    private handleMessage(data: any) {
        switch (data.type) {
            case 'init':
                this.localPlayerId = data.id;
                console.log(`[Network] My ID is ${this.localPlayerId}`);
                break;
            case 'player_list':
                for (const p of data.players) {
                    this.entityManager.addRemotePlayer(p.id, p.username, p.position);
                }
                break;
            case 'player_join':
                if (data.player.id !== this.localPlayerId) {
                    this.entityManager.addRemotePlayer(data.player.id, data.player.username, data.player.position);
                }
                break;
            case 'player_leave':
                this.entityManager.removeRemotePlayer(data.id);
                break;
            case 'player_move':
                if (data.id !== this.localPlayerId) {
                    this.entityManager.updateRemotePlayer(data.id, data.position, data.rotation);
                }
                break;
            case 'block_update':
                if (data.id !== this.localPlayerId) {
                    this.world.setBlock(data.x, data.y, data.z, data.blockType, true); // true = skip network broadcast
                }
                break;
            case 'chat':
                // Event dispatched to UI
                const event = new CustomEvent('chat_message', { detail: data });
                window.dispatchEvent(event);
                break;
            case 'mob_spawn':
                this.entityManager.addNetworkMob(data.id, data.isHostile, data.position);
                break;
            case 'mob_move':
                this.entityManager.updateNetworkMob(data.id, data.position);
                break;
            default:
                console.log(`[Network] Unhandled message type: ${data.type}`);
        }
    }

    public isHost(): boolean {
        if (!this.connected) return true; // Offline is always host
        const others = this.entityManager.getRemotePlayerIds();
        if (others.length === 0) return true;

        // Host is the one with the lowest lexicographical ID
        const allIds = [this.localPlayerId, ...others];
        allIds.sort();
        return allIds[0] === this.localPlayerId;
    }

    public send(data: any) {
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    public update() {
        if (!this.connected) return;

        // Send movement update if moved significantly or rotated
        const pPos = this.player.camera.position;
        // The rotation around Y axis in Three.js Euler is roughly where they are looking
        const euler = new THREE.Euler().setFromQuaternion(this.player.camera.quaternion, 'YXZ');
        const rotY = euler.y;

        const distSq = this.lastSentPos.distanceToSquared(pPos);
        const rotDiff = Math.abs(this.lastSentRotY - rotY);

        // Send if moved more than 0.05 units or rotated more than ~1 degree (OR if it's the first update)
        if (this.firstUpdate || distSq > 0.05 * 0.05 || rotDiff > 0.02) {
            this.send({
                type: 'move',
                position: { x: pPos.x, y: pPos.y, z: pPos.z },
                rotation: { y: rotY }
            });
            this.lastSentPos.copy(pPos);
            this.lastSentRotY = rotY;
            this.firstUpdate = false;
        }

        // Broadast mob moves if host
        if (this.isHost()) {
            const mobs = this.entityManager.getMobs();
            for (const mob of mobs) {
                this.send({
                    type: 'mob_move',
                    id: (mob as any).id,
                    position: { x: mob.mesh.position.x, y: mob.mesh.position.y, z: mob.mesh.position.z }
                });
            }
        }
    }
}
