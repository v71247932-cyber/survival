// js/world.js — Terrain, trees, rocks, berry bushes, water
import * as THREE from 'three';
import { createNoise } from './noise.js';

const noise = createNoise();

const SIZE = 400;
const SEGS = 120;
const CELL = SIZE / SEGS;

// Build height map
const HM = [];
for (let iz = 0; iz <= SEGS; iz++) {
    HM[iz] = [];
    for (let ix = 0; ix <= SEGS; ix++) {
        const wx = (ix / SEGS - 0.5) * SIZE;
        const wz = (iz / SEGS - 0.5) * SIZE;
        const h = noise.octave(wx * 0.004, wz * 0.004, 5, 0.55, 2.1) * 55
            + noise.octave(wx * 0.015, wz * 0.015, 3, 0.5, 2) * 10;
        HM[iz][ix] = h;
    }
}

export function getTerrainHeight(x, z) {
    const gx = (x / SIZE + 0.5) * SEGS;
    const gz = (z / SIZE + 0.5) * SEGS;
    const ix = Math.floor(gx), iz = Math.floor(gz);
    const fx = gx - ix, fz = gz - iz;
    const ax = Math.min(ix, SEGS - 1), az = Math.min(iz, SEGS - 1);
    const bx = Math.min(ix + 1, SEGS), bz = Math.min(iz + 1, SEGS);
    const h00 = (HM[az] && HM[az][ax]) ?? 0;
    const h10 = (HM[az] && HM[az][bx]) ?? 0;
    const h01 = (HM[bz] && HM[bz][ax]) ?? 0;
    const h11 = (HM[bz] && HM[bz][bx]) ?? 0;
    return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
}

export class World {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.resources = []; // {type, mesh, health, maxHealth, pos, respawnTimer}
        this.placed = []; // placed building meshes
        this.campfires = []; // active campfire positions
    }

    generate(onProgress) {
        onProgress?.(10, 'Building terrain...');
        this._buildTerrain();
        onProgress?.(40, 'Growing trees...');
        this._spawnTrees(220);
        onProgress?.(60, 'Placing rocks...');
        this._spawnRocks(140);
        onProgress?.(75, 'Planting bushes...');
        this._spawnBushes(80);
        onProgress?.(85, 'Filling water...');
        this._buildWater();
        onProgress?.(95, 'Lighting world...');
        this._buildLights();
        onProgress?.(100, 'Done!');
    }

    _buildTerrain() {
        const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        const colors = [];

        for (let i = 0; i < pos.count; i++) {
            const ix = i % (SEGS + 1);
            const iz = Math.floor(i / (SEGS + 1));
            const h = HM[iz]?.[ix] ?? 0;
            pos.setY(i, h);

            // Vertex color by height
            let r, g, b;
            if (h < -2) { r = 0.20; g = 0.45; b = 0.25; }      // deep water edge
            else if (h < 2) { r = 0.78; g = 0.70; b = 0.52; }      // sand
            else if (h < 16) { r = 0.27; g = 0.48; b = 0.18; }      // grass
            else if (h < 26) { r = 0.35; g = 0.40; b = 0.22; }      // green-rock
            else if (h < 34) { r = 0.48; g = 0.42; b = 0.35; }      // rock
            else { r = 0.85; g = 0.87; b = 0.90; }      // snow
            colors.push(r, g, b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
        this.terrainMesh = new THREE.Mesh(geo, mat);
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.name = 'terrain';
        this.scene.add(this.terrainMesh);
    }

    _buildWater() {
        const geo = new THREE.PlaneGeometry(SIZE, SIZE);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshLambertMaterial({
            color: 0x1a4d8f, transparent: true, opacity: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.5;
        mesh.name = 'water';
        this.scene.add(mesh);
    }

    _buildLights() {
        this.sun = new THREE.DirectionalLight(0xfff8e0, 1.4);
        this.sun.position.set(100, 200, 100);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        this.sun.shadow.camera.near = 1;
        this.sun.shadow.camera.far = 600;
        this.sun.shadow.camera.left = -250;
        this.sun.shadow.camera.right = 250;
        this.sun.shadow.camera.top = 250;
        this.sun.shadow.camera.bottom = -250;
        this.scene.add(this.sun);

        this.ambient = new THREE.AmbientLight(0x8bbfd4, 0.5);
        this.scene.add(this.ambient);

        this.hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c2f, 0.4);
        this.scene.add(this.hemi);
    }

    _rndPos(margin = 20) {
        const half = SIZE / 2 - margin;
        let x, z, h, tries = 0;
        do {
            x = (Math.random() - 0.5) * 2 * half;
            z = (Math.random() - 0.5) * 2 * half;
            h = getTerrainHeight(x, z);
            tries++;
        } while ((h < 2 || h > 33) && tries < 20);
        return { x, z, h };
    }

    _spawnTrees(count) {
        const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 6, 6);
        const leavesGeo = new THREE.ConeGeometry(2.8, 7, 7);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3317 });
        const leavesMat = new THREE.MeshLambertMaterial({ color: 0x2d6a1f });

        for (let i = 0; i < count; i++) {
            const { x, z, h } = this._rndPos();
            const scale = 0.7 + Math.random() * 0.8;

            const group = new THREE.Group();
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 3;
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.y = 8.5;
            group.add(trunk, leaves);
            group.position.set(x, h, z);
            group.scale.setScalar(scale);
            group.castShadow = true;
            group.name = 'tree';
            this.scene.add(group);

            this.resources.push({
                type: 'tree', mesh: group, pos: new THREE.Vector3(x, h, z),
                health: 5, maxHealth: 5, respawnTimer: 0
            });
        }
    }

    _spawnRocks(count) {
        const geo = new THREE.DodecahedronGeometry(1.2, 0);
        const mat = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });

        for (let i = 0; i < count; i++) {
            const { x, z, h } = this._rndPos(30);
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.scale.set(0.8 + Math.random(), 0.5 + Math.random() * 0.6, 0.8 + Math.random());
            mesh.rotation.y = Math.random() * Math.PI * 2;
            mesh.position.set(x, h + 0.5, z);
            mesh.castShadow = true;
            mesh.name = 'rock';
            this.scene.add(mesh);

            // Chance of flint in rock
            const drops = Math.random() < 0.3 ? [{ id: 'stone', qty: [2, 4] }, { id: 'flint', qty: [1, 1] }]
                : [{ id: 'stone', qty: [2, 5] }];
            this.resources.push({
                type: 'rock', mesh, pos: new THREE.Vector3(x, h, z),
                health: 4, maxHealth: 4, respawnTimer: 0, drops
            });
        }
    }

    _spawnBushes(count) {
        const geo = new THREE.SphereGeometry(1, 6, 5);
        const mat = new THREE.MeshLambertMaterial({ color: 0x1a8020 });

        for (let i = 0; i < count; i++) {
            const { x, z, h } = this._rndPos(20);
            const mesh = new THREE.Mesh(geo, mat.clone());
            const s = 0.6 + Math.random() * 0.6;
            mesh.scale.set(s, s * 0.8, s);
            mesh.position.set(x, h + 0.6, z);
            mesh.name = 'bush';
            this.scene.add(mesh);

            this.resources.push({
                type: 'bush', mesh, pos: new THREE.Vector3(x, h, z),
                health: 3, maxHealth: 3, berries: 3, respawnTimer: 0
            });
        }
    }

    // Place a building piece into the world
    placePiece(type, position, rotation, color) {
        let mesh;
        const mat = new THREE.MeshLambertMaterial({ color });

        if (type === 'floor') {
            const geo = new THREE.BoxGeometry(4, 0.2, 4);
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
        } else if (type === 'wall') {
            const geo = new THREE.BoxGeometry(4, 3, 0.3);
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            mesh.rotation.y = rotation;
        } else if (type === 'door') {
            const geo = new THREE.BoxGeometry(1.5, 3, 0.3);
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            mesh.rotation.y = rotation;
        } else if (type === 'roof') {
            const geo = new THREE.ConeGeometry(3.2, 2, 4);
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            mesh.rotation.y = Math.PI / 4;
        } else if (type === 'campfire') {
            const base = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 8);
            mesh = new THREE.Mesh(base, new THREE.MeshLambertMaterial({ color: 0x5c3317 }));
            mesh.position.copy(position);
            // Point light for campfire
            const light = new THREE.PointLight(0xff5500, 2, 15);
            light.position.set(0, 1, 0);
            mesh.add(light);
            this.campfires.push(position.clone());
        }

        if (mesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.name = type;
            this.scene.add(mesh);
            this.placed.push({ type, mesh, position: position.clone() });
        }
        return mesh;
    }

    // Remove a resource from scene (after harvesting)
    removeResource(res) {
        this.scene.remove(res.mesh);
        res.mesh.geometry?.dispose?.();
        res.health = 0;
        // Respawn after 3 minutes
        res.respawnTimer = 180;
    }

    isNearCampfire(pos, range = 8) {
        return this.campfires.some(cf => cf.distanceTo(pos) < range);
    }

    update(delta) {
        // Handle resource respawn
        for (const r of this.resources) {
            if (r.health <= 0 && r.respawnTimer > 0) {
                r.respawnTimer -= delta;
                if (r.respawnTimer <= 0) {
                    r.health = r.maxHealth;
                    if (r.type === 'bush') r.berries = 3;
                    this.scene.add(r.mesh);
                }
            }
        }
    }
}
