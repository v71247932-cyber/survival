// js/entities.js — Animals: Deer (passive) + Wolf (aggressive)
import * as THREE from 'three';
import { getTerrainHeight } from './world.js';

const DEER_COLOR = 0xa0522d;
const WOLF_COLOR = 0x555566;

function buildAnimalMesh(bodyColor) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: bodyColor });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.6), mat);
    body.position.y = 0.9;
    group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.5), mat);
    head.position.set(0.7, 1.3, 0);
    group.add(head);

    // Legs (4)
    const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
    const legMat = mat;
    [[-0.4, -0.2], [-0.4, 0.2], [0.4, -0.2], [0.4, 0.2]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, 0.35, z);
        group.add(leg);
    });

    group.castShadow = true;
    return group;
}

class Animal {
    constructor(scene, x, z, type) {
        this.scene = scene;
        this.type = type;
        this.health = type === 'wolf' ? 50 : 30;
        this.state = 'wander'; // wander | flee | chase | attack
        this.speed = type === 'wolf' ? 6 : 4.5;
        this.target = new THREE.Vector3();
        this.wanderTimer = 0;
        this.attackTimer = 0;

        this.mesh = buildAnimalMesh(type === 'wolf' ? WOLF_COLOR : DEER_COLOR);
        const h = getTerrainHeight(x, z);
        this.mesh.position.set(x, h, z);
        this.mesh.name = type;
        scene.add(this.mesh);

        this._pickWanderTarget();
    }

    _pickWanderTarget() {
        const pos = this.mesh.position;
        this.target.set(
            pos.x + (Math.random() - 0.5) * 30,
            0,
            pos.z + (Math.random() - 0.5) * 30
        );
        this.wanderTimer = 3 + Math.random() * 5;
    }

    update(delta, playerPos) {
        const pos = this.mesh.position;
        const dist = pos.distanceTo(playerPos);

        // State transitions
        if (this.type === 'deer') {
            if (dist < 15) this.state = 'flee';
            else if (dist > 30 && this.state === 'flee') { this.state = 'wander'; this._pickWanderTarget(); }
        } else if (this.type === 'wolf') {
            if (dist < 25 && this.state === 'wander') this.state = 'chase';
            if (dist > 35 && this.state !== 'wander') { this.state = 'wander'; this._pickWanderTarget(); }
            if (dist < 2.5 && this.state === 'chase') this.state = 'attack';
            if (dist > 4 && this.state === 'attack') this.state = 'chase';
        }

        // Movement
        let moveDir = new THREE.Vector3();
        if (this.state === 'flee') {
            moveDir.subVectors(pos, playerPos).normalize();
        } else if (this.state === 'chase') {
            moveDir.subVectors(playerPos, pos).normalize();
        } else if (this.state === 'wander') {
            moveDir.subVectors(this.target, pos).normalize();
            this.wanderTimer -= delta;
            if (this.wanderTimer <= 0 || pos.distanceTo(this.target) < 2) this._pickWanderTarget();
        }

        if (this.state !== 'attack') {
            pos.addScaledVector(moveDir, this.speed * delta);
        }

        // Rotate toward movement
        if (moveDir.length() > 0.01) {
            const angle = Math.atan2(moveDir.x, moveDir.z);
            this.mesh.rotation.y = angle;
        }

        // Clamp to terrain
        pos.y = getTerrainHeight(pos.x, pos.z);
        pos.x = Math.max(-195, Math.min(195, pos.x));
        pos.z = Math.max(-195, Math.min(195, pos.z));

        // Attack player
        if (this.state === 'attack') {
            this.attackTimer += delta;
            if (this.attackTimer >= 1.5) {
                this.attackTimer = 0;
                return 'attack'; // signal to apply damage
            }
        }

        // Animate legs
        const t = Date.now() * 0.005;
        const legSpeed = this.state !== 'wander' ? 3 : 1;
        this.mesh.children.forEach((c, i) => {
            if (i > 1) c.rotation.x = Math.sin(t * legSpeed + i) * 0.4;
        });

        return null;
    }

    die() {
        this.scene.remove(this.mesh);
    }
}

export class EntityManager {
    constructor(game) {
        this.game = game;
        this.animals = [];
    }

    spawn() {
        const world = this.game.world;
        // Spawn deer
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            const h = getTerrainHeight(x, z);
            if (h > 2) this.animals.push(new Animal(this.game.scene, x, z, 'deer'));
        }
        // Spawn wolves
        for (let i = 0; i < 8; i++) {
            const x = (Math.random() - 0.5) * 350;
            const z = (Math.random() - 0.5) * 350;
            const h = getTerrainHeight(x, z);
            if (h > 2) this.animals.push(new Animal(this.game.scene, x, z, 'wolf'));
        }
    }

    update(delta) {
        const playerPos = this.game.player?.getPosition();
        if (!playerPos) return;

        const surv = this.game.survival;
        const dead = [];

        for (const animal of this.animals) {
            const result = animal.update(delta, playerPos);
            if (result === 'attack' && surv) {
                surv.health = Math.max(0, surv.health - 8);
                this.game.ui?.flashHit();
                this.game.ui?.notify('🐺 Wolf attack! -8 HP', 'danger');
            }
            if (animal.health <= 0) dead.push(animal);
        }

        dead.forEach(a => {
            a.die();
            this.animals.splice(this.animals.indexOf(a), 1);
            if (a.type !== 'deer' || Math.random() < 0.8) {
                this.game.inventory?.addItem('raw_meat', 1 + Math.floor(Math.random() * 2));
                this.game.ui?.notify('🥩 Got raw meat!');
            }
        });

        // Respawn animals occasionally
        if (this.animals.length < 15 && Math.random() < 0.001) {
            const x = playerPos.x + (Math.random() - 0.5) * 200;
            const z = playerPos.z + (Math.random() - 0.5) * 200;
            const h = getTerrainHeight(x, z);
            if (h > 2) {
                const type = Math.random() < 0.7 ? 'deer' : 'wolf';
                this.animals.push(new Animal(this.game.scene, x, z, type));
            }
        }
    }
}
