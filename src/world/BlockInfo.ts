export enum BlockType {
    AIR = 0,
    GRASS = 1,
    DIRT = 2,
    STONE = 3,
    WOOD = 4,
    LEAVES = 5,
    SAND = 6,
    WATER = 7,
    GLASS = 8
}

export const BlockTransparent: Record<BlockType, boolean> = {
    [BlockType.AIR]: true,
    [BlockType.GRASS]: false,
    [BlockType.DIRT]: false,
    [BlockType.STONE]: false,
    [BlockType.WOOD]: false,
    [BlockType.LEAVES]: true,
    [BlockType.SAND]: false,
    [BlockType.WATER]: true,
    [BlockType.GLASS]: true
};

// Returns an array of material indices for [px, nx, py, ny, pz, nz] (right, left, top, bottom, front, back)
export function getBlockMaterialIndices(type: BlockType): number[] {
    switch (type) {
        case BlockType.GRASS: return [2, 2, 1, 3, 2, 2]; // 1: Grass Top, 2: Grass Side, 3: Dirt Bottom
        case BlockType.DIRT: return [3, 3, 3, 3, 3, 3];
        case BlockType.STONE: return [4, 4, 4, 4, 4, 4];
        case BlockType.WOOD: return [6, 6, 5, 5, 6, 6]; // 5: Wood Top/Bottom, 6: Wood Bark
        case BlockType.LEAVES: return [7, 7, 7, 7, 7, 7];
        case BlockType.SAND: return [8, 8, 8, 8, 8, 8];
        case BlockType.WATER: return [9, 9, 9, 9, 9, 9];
        case BlockType.GLASS: return [10, 10, 10, 10, 10, 10];
        default: return [0, 0, 0, 0, 0, 0];
    }
}
