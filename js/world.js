// js/world.js — Terrain, trees, rocks, berry bushes, water
import * as THREE from 'three';
import { createNoise } from './noise.js';

const noise = createNoise();

// Global world settings
const SIZE = 1000;
const SEGS = 180; // Decreased slightly for performance at large scale
const CELL = SIZE / SEGS;

// Global height map for height lookups
const HM = [];
function initHM() {
    for (let iz = 0; iz <= SEGS; iz++) {
        HM[iz] = [];
        for (let ix = 0; ix <= SEGS; ix++) {
            const wx = (ix / SEGS - 0.5) * SIZE;
            const wz = (iz / SEGS - 0.5) * SIZE;
            // Precise height calculation
            const h = noise.octave(wx / 140, wz / 140, 6, 0.5, 2.0) * 22;
            HM[iz][ix] = h < 0 ? h * 0.3 : h;
        }
    }
}
initHM();

export function getTerrainHeight(x, z) {
    const gx = (x / SIZE + 0.5) * SEGS;
    const gz = (z / SIZE + 0.5) * SEGS;
    const ix = Math.floor(gx), iz = Math.floor(gz);
    const fx = gx - ix, fz = gz - iz;
    const ax = Math.max(0, Math.min(ix, SEGS - 1)), az = Math.max(0, Math.min(iz, SEGS - 1));
    const bx = Math.max(0, Math.min(ix + 1, SEGS)), bz = Math.max(0, Math.min(iz + 1, SEGS));
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
        this.resources = [];
        this.placed = [];
        this.campfires = [];

        // Textures
        const texLoader = new THREE.TextureLoader();
        this.textures = {
            grass: texLoader.load('./assets/grass.png'),
            rock: texLoader.load('./assets/rock.png'),
            sand: texLoader.load('./assets/sand.png'),
            snow: texLoader.load('./assets/snow.png')
        };

        Object.values(this.textures).forEach(t => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(SIZE / 10, SIZE / 10); // Tiling density
        });
    }

    generate(onProgress) {
        onProgress?.(10, 'Shaping the vast world...');
        this._buildTerrain();

        onProgress?.(30, 'Simulating ocean...');
        this._buildWater();

        onProgress?.(50, 'Growing forests & cliffs...');
        this._spawnResources();

        onProgress?.(90, 'Setting up lighting...');
        this._buildLights();

        onProgress?.(100, 'World Expansion Complete!');
    }

    _buildTerrain() {
        const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        const colors = []; // Still useful for blending if we ever upgrade to a custom shader

        for (let i = 0; i < pos.count; i++) {
            const ix = i % (SEGS + 1);
            const iz = Math.floor(i / (SEGS + 1));
            const h = HM[iz][ix];
            pos.setY(i, h);
        }

        pos.needsUpdate = true;
        geo.computeVertexNormals();

        // Single material with tiling grass for the large world.
        // For more detail, we could use a custom shader to blend rock/sand/grass by height.
        const mat = new THREE.MeshLambertMaterial({
            map: this.textures.grass,
            flatShading: false
        });

        this.terrainMesh = new THREE.Mesh(geo, mat);
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.name = 'terrain';
        this.scene.add(this.terrainMesh);
    }

    _buildWater() {
        const geo = new THREE.PlaneGeometry(SIZE, SIZE);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshLambertMaterial({
            color: 0x1a4d8f, transparent: true, opacity: 0.75
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.5;
        mesh.name = 'water';
        this.scene.add(mesh);
    }

    _buildLights() {
        this.sun = new THREE.DirectionalLight(0xfff8e0, 1.4);
        this.sun.position.set(200, 400, 200);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(4096, 4096);
        this.sun.shadow.camera.near = 1;
        this.sun.shadow.camera.far = 1000;
        this.sun.shadow.camera.left = -SIZE / 2;
        this.sun.shadow.camera.right = SIZE / 2;
        this.sun.shadow.camera.top = SIZE / 2;
        this.sun.shadow.camera.bottom = -SIZE / 2;
        this.scene.add(this.sun);

        this.ambient = new THREE.AmbientLight(0x8bbfd4, 0.5);
        this.scene.add(this.ambient);

        this.hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c2f, 0.4);
        this.scene.add(this.hemi);
    }

    _spawnResources() {
        // High density for 1000x1000 world
        this._spawnGroup('tree', 600);
        this._spawnGroup('rock', 400);
        this._spawnGroup('bush', 300);
    }

    _spawnGroup(type, count) {
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * (SIZE * 0.95);
            const z = (Math.random() - 0.5) * (SIZE * 0.95);
            const h = getTerrainHeight(x, z);

            if (h < 1.5) continue; // Skip water/deep sand

            let mesh;
            if (type === 'tree') mesh = this._createTree();
            else if (type === 'rock') mesh = this._createRock();
            else if (type === 'bush') mesh = this._createBush();

            mesh.position.set(x, h, z);
            mesh.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(mesh);
            this.resources.push({
                type, mesh, pos: new THREE.Vector3(x, h, z),
                health: 5, maxHealth: 5, respawnTimer: 0
            });
        }
    }

    _createTree() {
        const group = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.4, 6, 6),
            new THREE.MeshLambertMaterial({ color: 0x5c3317 })
        );
        trunk.position.y = 3;
        const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(3, 8, 8),
            new THREE.MeshLambertMaterial({ color: 0x1a4314 })
        );
        leaves.position.y = 9;
        group.add(trunk, leaves);
        group.castShadow = true;
        group.scale.setScalar(0.7 + Math.random() * 0.8);
        return group;
    }

    _createRock() {
        const mesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.5, 0),
            new THREE.MeshLambertMaterial({ color: 0x666666, map: this.textures.rock })
        );
        mesh.scale.set(1 + Math.random(), 0.6 + Math.random(), 1 + Math.random());
        mesh.castShadow = true;
        return mesh;
    }

    _createBush() {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 8, 6),
            new THREE.MeshLambertMaterial({ color: 0x225522 })
        );
        mesh.scale.set(1, 0.7, 1);
        mesh.castShadow = true;
        return mesh;
    }

    placePiece(type, position, rotation, color) {
        let mesh;
        const mat = new THREE.MeshLambertMaterial({ color });
        if (type === 'floor') {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), mat);
        } else if (type === 'wall') {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.3), mat);
            mesh.rotation.y = rotation;
        } else if (type === 'door') {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.3), mat);
            mesh.rotation.y = rotation;
        } else if (type === 'roof') {
            mesh = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2, 4), mat);
            mesh.rotation.y = Math.PI / 4;
        } else if (type === 'campfire') {
            mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 0.8, 0.2, 8),
                new THREE.MeshLambertMaterial({ color: 0x332211 })
            );
            const light = new THREE.PointLight(0xff6600, 1.5, 12);
            light.position.y = 1;
            mesh.add(light);
            this.campfires.push(position.clone());
        }

        if (mesh) {
            mesh.position.copy(position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.placed.push({ type, mesh, position: position.clone() });
        }
        return mesh;
    }

    removeResource(res) {
        this.scene.remove(res.mesh);
        res.health = 0;
        res.respawnTimer = 180;
    }

    isNearCampfire(pos, range = 8) {
        return this.campfires.some(cf => cf.distanceTo(pos) < range);
    }

    update(delta) {
        for (const r of this.resources) {
            if (r.health <= 0 && r.respawnTimer > 0) {
                r.respawnTimer -= delta;
                if (r.respawnTimer <= 0) {
                    r.health = r.maxHealth;
                    this.scene.add(r.mesh);
                }
            }
        }
    }
}
