import * as THREE from 'three';
import { BlockType, BlockTransparent, getBlockMaterialIndices } from './BlockInfo';

export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 128;

// Voxel face data: right, left, top, bottom, front, back
const faceDirections = [
    { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
    { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

const faceUVs = [
    [0, 0], [1, 0], [1, 1], [0, 1]
];

export class Chunk {
    public data: Uint8Array;
    public mesh: THREE.Mesh;
    public dx: number;
    public dz: number;
    public isDirty: boolean = false;

    constructor(dx: number, dz: number, scene: THREE.Scene) {
        this.dx = dx;
        this.dz = dz;
        this.data = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_WIDTH);
        this.mesh = new THREE.Mesh(new THREE.BufferGeometry());
        this.mesh.position.set(dx * CHUNK_WIDTH, 0, dz * CHUNK_WIDTH);
        this.mesh.castShadow = false;
        this.mesh.receiveShadow = true;
        this.mesh.matrixAutoUpdate = false;
        this.mesh.updateMatrix();
        scene.add(this.mesh);
    }

    public getBlock(x: number, y: number, z: number): BlockType {
        if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_WIDTH) {
            return BlockType.AIR; // Out of bounds treated as air for meshing edges
        }
        return this.data[x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_WIDTH];
    }

    public setBlock(x: number, y: number, z: number, type: BlockType) {
        if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_WIDTH) return;
        this.data[x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_WIDTH] = type;
        this.isDirty = true;
    }

    public buildMesh(materials: THREE.Material[]) {
        const positions: number[] = [];
        const normals: number[] = [];
        const indices: number[] = [];
        const uvs: number[] = [];
        const groups: { start: number, count: number, materialIndex: number }[] = [];

        let indexOffset = 0;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_WIDTH; z++) {
                for (let x = 0; x < CHUNK_WIDTH; x++) {
                    const blockType = this.getBlock(x, y, z);
                    if (blockType === BlockType.AIR) continue;

                    const matIndices = getBlockMaterialIndices(blockType);

                    for (let i = 0; i < 6; i++) {
                        const { dir, corners } = faceDirections[i];
                        const nx = x + dir[0];
                        const ny = y + dir[1];
                        const nz = z + dir[2];
                        const neighbor = this.getBlock(nx, ny, nz);

                        // If out of bounds of this chunk, we assume transparent for now (could connect chunks later)
                        const isNeighborOob = nx < 0 || nx >= CHUNK_WIDTH || ny < 0 || ny >= CHUNK_HEIGHT || nz < 0 || nz >= CHUNK_WIDTH;

                        // Render face if neighbor is transparent, water doesn't render against water
                        if ((isNeighborOob || BlockTransparent[neighbor]) && !(blockType === BlockType.WATER && neighbor === BlockType.WATER)) {

                            for (const c of corners) {
                                positions.push(x + c[0], y + c[1], z + c[2]);
                                normals.push(...dir);
                            }
                            uvs.push(...faceUVs.flat());

                            indices.push(
                                indexOffset, indexOffset + 1, indexOffset + 2,
                                indexOffset + 2, indexOffset + 3, indexOffset
                            );

                            groups.push({
                                start: indices.length - 6,
                                count: 6,
                                materialIndex: matIndices[i]
                            });

                            indexOffset += 4;
                        }
                    }
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        // Combine groups by materialIndex
        const optimizedGroups: typeof groups = [];
        for (const g of groups) {
            if (optimizedGroups.length > 0 && optimizedGroups[optimizedGroups.length - 1].materialIndex === g.materialIndex) {
                optimizedGroups[optimizedGroups.length - 1].count += 6;
            } else {
                optimizedGroups.push(g);
            }
        }

        optimizedGroups.forEach(g => geometry.addGroup(g.start, g.count, g.materialIndex));

        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        this.mesh.geometry = geometry;
        this.mesh.material = materials;
        this.isDirty = false;
    }
}
