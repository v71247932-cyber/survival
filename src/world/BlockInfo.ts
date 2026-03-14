export enum BlockType {
    AIR = 0,
    GRASS = 1,
    DIRT = 2,
    STONE = 3,
    WOOD = 4,
    LEAVES = 5,
    SAND = 6,
    WATER = 7,
    GLASS = 8,
    COBBLESTONE = 9,
    WOOD_PLANKS = 10,
    GRAVEL = 11,
    BRICKS = 12,
    SANDSTONE = 13,
    GOLD_BLOCK = 14,
    BEDROCK = 15,
    IRON_BLOCK = 16,
    CRAFTING_TABLE = 17,
    BED = 18,
    WOOL = 19
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
    [BlockType.GLASS]: true,
    [BlockType.COBBLESTONE]: false,
    [BlockType.WOOD_PLANKS]: false,
    [BlockType.GRAVEL]: false,
    [BlockType.BRICKS]: false,
    [BlockType.SANDSTONE]: false,
    [BlockType.GOLD_BLOCK]: false,
    [BlockType.BEDROCK]: false,
    [BlockType.IRON_BLOCK]: false,
    [BlockType.CRAFTING_TABLE]: false,
    [BlockType.BED]: true,
    [BlockType.WOOL]: false
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
        case BlockType.COBBLESTONE: return [11, 11, 11, 11, 11, 11];
        case BlockType.WOOD_PLANKS: return [12, 12, 12, 12, 12, 12];
        case BlockType.GRAVEL: return [13, 13, 13, 13, 13, 13];
        case BlockType.BRICKS: return [14, 14, 14, 14, 14, 14];
        case BlockType.SANDSTONE: return [15, 15, 15, 15, 15, 15];
        case BlockType.GOLD_BLOCK: return [16, 16, 16, 16, 16, 16];
        case BlockType.BEDROCK: return [17, 17, 17, 17, 17, 17];
        case BlockType.IRON_BLOCK: return [18, 18, 18, 18, 18, 18];
        case BlockType.CRAFTING_TABLE: return [20, 20, 19, 12, 20, 20]; // 19: CT Top, 20: CT Side, 12: CT Planks (Bottom)
        case BlockType.BED: return [21, 21, 21, 12, 21, 21]; // 21: Bed
        case BlockType.WOOL: return [22, 22, 22, 22, 22, 22]; // 22: Wool
        default: return [0, 0, 0, 0, 0, 0];
    }
}
