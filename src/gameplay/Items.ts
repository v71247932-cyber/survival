import { BlockType } from '../world/BlockInfo';

export enum ItemID {
    NONE = 0,
    GRASS_BLOCK = 1,
    DIRT_BLOCK = 2,
    STONE_BLOCK = 3,
    WOOD_BLOCK = 4,
    LEAVES_BLOCK = 5,
    SAND_BLOCK = 6,
    COBBLESTONE_BLOCK = 9,
    WOOD_PLANKS_BLOCK = 10,
    GRAVEL_BLOCK = 11,
    BRICKS_BLOCK = 12,
    SANDSTONE_BLOCK = 13,
    GOLD_BLOCK = 14,
    BEDROCK_BLOCK = 15,

    STICK = 50,

    // Tools
    WOODEN_PICKAXE = 100,
    STONE_PICKAXE = 101,
}

export interface InventorySlot {
    item: ItemID;
    count: number;
    durability?: number;
}

export function getItemName(id: ItemID): string {
    return ItemID[id] || 'Unknown';
}

export function isBlockItem(id: ItemID): boolean {
    return id > 0 && id < 100;
}

export function getBlockTypeFromItem(id: ItemID): BlockType {
    if (isBlockItem(id)) return id as number as BlockType;
    return BlockType.AIR;
}

export function getItemFromBlockType(type: BlockType): ItemID {
    if (type !== BlockType.AIR && type !== BlockType.WATER && type !== BlockType.GLASS) return type as number as ItemID;
    return ItemID.NONE;
}
