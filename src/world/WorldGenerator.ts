import { createNoise2D, createNoise3D } from 'simplex-noise';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT } from './Chunk';
import { BlockType } from './BlockInfo';

export class WorldGenerator {
    private noise2D = createNoise2D();
    private noise3D = createNoise3D();
    private seedOffset: number;

    constructor(seed?: number) {
        this.seedOffset = seed || Math.random() * 10000;
        // In a real app we would seed the noise generator PRNG properly
    }

    public generateChunk(chunk: Chunk) {
        const dx = chunk.dx * CHUNK_WIDTH;
        const dz = chunk.dz * CHUNK_WIDTH;

        for (let x = 0; x < CHUNK_WIDTH; x++) {
            for (let z = 0; z < CHUNK_WIDTH; z++) {
                const worldX = dx + x;
                const worldZ = dz + z;

                // Base terrain height and biomes
                const e = 1 * this.noise(1 * worldX, 1 * worldZ, 0.005)
                    + 0.5 * this.noise(2 * worldX, 2 * worldZ, 0.01)
                    + 0.25 * this.noise(4 * worldX, 4 * worldZ, 0.02);

                // Map e from roughly -1..1 to height
                const height = Math.floor(40 + (e + 1) * 20);

                // Humidity/temperature for biomes
                const moisture = this.noise(worldX, worldZ, 0.003); // -1 to 1

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    if (y > height) {
                        if (y <= 42) {
                            chunk.setBlock(x, y, z, BlockType.WATER);
                        } else {
                            chunk.setBlock(x, y, z, BlockType.AIR);
                        }
                    } else if (y === height) {
                        if (y <= 44) {
                            chunk.setBlock(x, y, z, BlockType.SAND);
                        } else {
                            if (moisture < -0.2 && y < 60) chunk.setBlock(x, y, z, BlockType.SAND); // Desert
                            else chunk.setBlock(x, y, z, BlockType.GRASS); // Plains/Forest
                        }
                    } else if (y > height - 4) {
                        if (y <= 44) {
                            chunk.setBlock(x, y, z, BlockType.SAND);
                        } else {
                            if (moisture < -0.2 && y < 60) chunk.setBlock(x, y, z, BlockType.SAND);
                            else chunk.setBlock(x, y, z, BlockType.DIRT);
                        }
                    } else {
                        // Caves using 3D noise
                        const caveNoise = this.noise3D(worldX * 0.05, y * 0.05, worldZ * 0.05);
                        if (caveNoise > 0.4) {
                            chunk.setBlock(x, y, z, BlockType.AIR);
                        } else {
                            chunk.setBlock(x, y, z, BlockType.STONE);
                        }
                    }
                }

                // Trees
                if (height > 44 && moisture >= -0.2 && Math.random() < 0.01) {
                    this.generateTree(chunk, x, height + 1, z);
                }
            }
        }
    }

    private generateTree(chunk: Chunk, x: number, y: number, z: number) {
        const height = 4 + Math.floor(Math.random() * 3);
        // Trunk
        for (let i = 0; i < height; i++) {
            chunk.setBlock(x, y + i, z, BlockType.WOOD);
        }
        // Leaves
        for (let lx = -2; lx <= 2; lx++) {
            for (let ly = height - 2; ly <= height + 1; ly++) {
                for (let lz = -2; lz <= 2; lz++) {
                    if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && (ly === height + 1 || Math.random() < 0.5)) continue;
                    if (chunk.getBlock(x + lx, y + ly, z + lz) === BlockType.AIR) {
                        chunk.setBlock(x + lx, y + ly, z + lz, BlockType.LEAVES);
                    }
                }
            }
        }
    }

    private noise(x: number, z: number, scale: number) {
        return this.noise2D(x * scale + this.seedOffset, z * scale + this.seedOffset);
    }
}
