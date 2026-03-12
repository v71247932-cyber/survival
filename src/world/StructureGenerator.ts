import { Chunk, CHUNK_WIDTH } from './Chunk';
import { BlockType } from './BlockInfo';

export class StructureGenerator {
    private seedOffset: number;

    constructor(seedOffset: number) {
        this.seedOffset = seedOffset;
    }

    // Deterministic random
    private random(x: number, z: number, salt: number) {
        const seed = x * 12345.6 + z * 78901.2 + salt * 34567.8 + this.seedOffset;
        const x_ = Math.sin(seed) * 10000;
        return x_ - Math.floor(x_);
    }

    public generateStructures(chunk: Chunk, heightmap: number[][]) {
        // One potential structure spawn per chunk
        const strRand = this.random(chunk.dx, chunk.dz, 1);

        if (strRand < 0.05) { // 5% chance for a ruin
            const localX = Math.floor(this.random(chunk.dx, chunk.dz, 2) * (CHUNK_WIDTH - 6)) + 3;
            const localZ = Math.floor(this.random(chunk.dx, chunk.dz, 3) * (CHUNK_WIDTH - 6)) + 3;
            const y = heightmap[localX][localZ];

            if (y > 45 && y < 70) { // Not underwater or too high
                this.buildRuin(chunk, localX, y + 1, localZ);
            }
        }
        else if (strRand >= 0.05 && strRand < 0.07) { // 2% chance for village house
            const localX = Math.floor(this.random(chunk.dx, chunk.dz, 4) * (CHUNK_WIDTH - 8)) + 4;
            const localZ = Math.floor(this.random(chunk.dx, chunk.dz, 5) * (CHUNK_WIDTH - 8)) + 4;
            const y = heightmap[localX][localZ];

            if (y > 45 && y < 70) {
                this.buildVillageHouse(chunk, localX, y + 1, localZ);
            }
        }

        // Dungeon (Underground)
        const dngRand = this.random(chunk.dx, chunk.dz, 6);
        if (dngRand < 0.08) { // 8% chance per chunk
            const localX = Math.floor(this.random(chunk.dx, chunk.dz, 7) * (CHUNK_WIDTH - 8)) + 4;
            const localZ = Math.floor(this.random(chunk.dx, chunk.dz, 8) * (CHUNK_WIDTH - 8)) + 4;
            const y = Math.floor(10 + this.random(chunk.dx, chunk.dz, 9) * 20); // Deep underground

            this.buildDungeon(chunk, localX, y, localZ);
        }
    }

    private buildRuin(chunk: Chunk, x: number, y: number, z: number) {
        // Small 5x5 hollow box of cobblestone/mossy with missing blocks
        for (let ix = -2; ix <= 2; ix++) {
            for (let iz = -2; iz <= 2; iz++) {
                for (let iy = 0; iy < 3; iy++) {
                    // Walls
                    if (Math.abs(ix) === 2 || Math.abs(iz) === 2) {
                        if (Math.random() < 0.7) { // 30% missing
                            chunk.setBlock(x + ix, y + iy, z + iz, BlockType.COBBLESTONE);
                        }
                    }
                }
                // Floor
                if (Math.random() < 0.9) {
                    chunk.setBlock(x + ix, y - 1, z + iz, BlockType.COBBLESTONE);
                }
            }
        }
        // Center Pillar
        chunk.setBlock(x, y, z, BlockType.COBBLESTONE);
        chunk.setBlock(x, y + 1, z, BlockType.COBBLESTONE);
    }

    private buildVillageHouse(chunk: Chunk, x: number, y: number, z: number) {
        // Simple 5x5 house
        const w = 2; // radius
        for (let ix = -w; ix <= w; ix++) {
            for (let iz = -w; iz <= w; iz++) {
                // Foundation/Floor
                chunk.setBlock(x + ix, y - 1, z + iz, BlockType.COBBLESTONE);

                // Walls
                if (Math.abs(ix) === w || Math.abs(iz) === w) {
                    for (let iy = 0; iy < 3; iy++) {
                        // Corners are wood, edges are planks
                        if (Math.abs(ix) === w && Math.abs(iz) === w) {
                            chunk.setBlock(x + ix, y + iy, z + iz, BlockType.WOOD);
                        } else {
                            if (iy === 1 && (ix === 0 || iz === 0) && Math.random() < 0.5) {
                                chunk.setBlock(x + ix, y + iy, z + iz, BlockType.GLASS);
                            } else {
                                chunk.setBlock(x + ix, y + iy, z + iz, BlockType.WOOD_PLANKS);
                            }
                        }
                    }
                } else {
                    // Inside is air
                    for (let iy = 0; iy < 3; iy++) {
                        chunk.setBlock(x + ix, y + iy, z + iz, BlockType.AIR);
                    }
                }

                // Roof
                chunk.setBlock(x + ix, y + 3, z + iz, BlockType.WOOD);
            }
        }

        // Doorway
        chunk.setBlock(x + w, y, z, BlockType.AIR);
        chunk.setBlock(x + w, y + 1, z, BlockType.AIR);

        // Add a gravel path block outside door
        chunk.setBlock(x + w + 1, y - 1, z, BlockType.GRAVEL);
    }

    private buildDungeon(chunk: Chunk, x: number, y: number, z: number) {
        const w = 3;
        const h = 4;
        for (let ix = -w; ix <= w; ix++) {
            for (let iz = -w; iz <= w; iz++) {
                for (let iy = -1; iy <= h; iy++) {
                    if (Math.abs(ix) === w || Math.abs(iz) === w || iy === -1 || iy === h) {
                        // Walls, Floor, Ceiling
                        chunk.setBlock(x + ix, y + iy, z + iz, BlockType.COBBLESTONE);
                    } else {
                        // Interior
                        chunk.setBlock(x + ix, y + iy, z + iz, BlockType.AIR);
                    }
                }
            }
        }
        // Spawner mockup
        chunk.setBlock(x, y, z, BlockType.BRICKS);
    }
}
