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
    private heartbeatInterval: any = null;

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
            this.send({ type: 'block_update', x, y, z, blockType: type });
        });
    }

    public connect(ip: string, username: string, realm: string = 'default') {
        this.currentRealm = realm;
        if (this.ws) this.ws.close();

        let protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        if (ip.startsWith('ws://') || ip.startsWith('wss://')) protocol = '';

        // CLEAN URL: Avoid query strings that might trip up proxies
        let url = `${protocol}${ip}${ip.endsWith('/') ? '' : '/'}`;

        console.log(`[Network] Connecting to ${url} (Realm: ${realm})...`);

        // Wake up Render
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

                // Send realm and username in FIRST message
                this.send({
                    type: 'set_username',
                    username: username,
                    realm: realm // Extend set_username to handle realm if needed or send separate realm_join
                });

                if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = setInterval(() => {
                    this.send({ type: 'ping' });
                }, 10000);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') return;
                    this.handleMessage(data);
                } catch (e) {
                    console.error('[Network] Parse error:', e);
                }
            };

            this.ws.onerror = (err) => {
                console.error('[Network] WebSocket error');
                this.ws?.close();
            };

            this.ws.onclose = () => {
                this.connected = false;
                if (this.statusElement) {
                    this.statusElement.style.color = '#ff5555';
                    this.statusElement.innerText = 'FPS: 0 [Offline - Retrying]';
                }
                this.entityManager.clearRemotePlayers();
                if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
                setTimeout(() => { if (!this.connected) this.connect(ip, username, realm); }, 10000);
            };
        } catch (e) {
            console.error('[Network] Connect failed:', e);
        }
    }

    private handleMessage(data: any) {
        switch (data.type) {
            case 'init':
                this.localPlayerId = data.id;
                break;
            case 'player_list':
                for (const p of data.players) this.entityManager.addRemotePlayer(p.id, p.username, p.position);
                break;
            case 'player_join':
                if (data.player.id !== this.localPlayerId) this.entityManager.addRemotePlayer(data.player.id, data.player.username, data.player.position);
                break;
            case 'player_leave':
                this.entityManager.removeRemotePlayer(data.id);
                break;
            case 'player_move':
                if (data.id !== this.localPlayerId) this.entityManager.updateRemotePlayer(data.id, data.position, data.rotation);
                break;
            case 'block_update':
                if (data.id !== this.localPlayerId) this.world.setBlock(data.x, data.y, data.z, data.blockType, true);
                break;
            case 'chat':
                window.dispatchEvent(new CustomEvent('chat_message', { detail: data }));
                break;
            case 'mob_spawn':
                this.entityManager.addNetworkMob(data.id, data.isHostile, data.position);
                break;
            case 'mob_move':
                this.entityManager.updateNetworkMob(data.id, data.position);
                break;
        }
    }

    public isHost(): boolean {
        if (!this.connected) return true;
        const others = this.entityManager.getRemotePlayerIds();
        if (others.length === 0) return true;
        const allIds = [this.localPlayerId, ...others].sort();
        return allIds[0] === this.localPlayerId;
    }

    public send(data: any) {
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    public update() {
        if (!this.connected) return;
        const pPos = this.player.camera.position;
        const euler = new THREE.Euler().setFromQuaternion(this.player.camera.quaternion, 'YXZ');
        const rotY = euler.y;
        const distSq = this.lastSentPos.distanceToSquared(pPos);
        const rotDiff = Math.abs(this.lastSentRotY - rotY);

        if (this.firstUpdate || distSq > 0.1 || rotDiff > 0.05) {
            this.send({ type: 'move', position: { x: pPos.x, y: pPos.y, z: pPos.z }, rotation: { y: rotY } });
            this.lastSentPos.copy(pPos);
            this.lastSentRotY = rotY;
            this.firstUpdate = false;
        }
    }
}
