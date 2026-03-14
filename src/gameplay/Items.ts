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
    IRON_BLOCK = 16,

    STICK = 50,
    IRON_INGOT = 51,
    GOLD_INGOT = 52,

    // Tools - Pickaxes
    WOODEN_PICKAXE = 100,
    STONE_PICKAXE = 101,
    IRON_PICKAXE = 102,
    GOLD_PICKAXE = 103,

    // Tools - Axes
    WOODEN_AXE = 110,
    STONE_AXE = 111,
    IRON_AXE = 112,
    GOLD_AXE = 113,

    // Tools - Shovels
    WOODEN_SHOVEL = 120,
    STONE_SHOVEL = 121,
    IRON_SHOVEL = 122,
    GOLD_SHOVEL = 123,

    // Tools - Swords
    WOODEN_SWORD = 130,
    STONE_SWORD = 131,
    IRON_SWORD = 132,
    GOLD_SWORD = 133,

    // Blocks/Items
    CRAFTING_TABLE = 17,
    BED = 18,
    WOOL = 19,
}

export interface InventorySlot {
    item: ItemID;
    count: number;
    durability?: number;
}

const itemNames: Record<number, string> = {
    [ItemID.GRASS_BLOCK]: 'Grass Block',
    [ItemID.DIRT_BLOCK]: 'Dirt',
    [ItemID.STONE_BLOCK]: 'Stone',
    [ItemID.WOOD_BLOCK]: 'Oak Log',
    [ItemID.LEAVES_BLOCK]: 'Leaves',
    [ItemID.SAND_BLOCK]: 'Sand',
    [ItemID.COBBLESTONE_BLOCK]: 'Cobblestone',
    [ItemID.WOOD_PLANKS_BLOCK]: 'Wooden Planks',
    [ItemID.GRAVEL_BLOCK]: 'Gravel',
    [ItemID.BRICKS_BLOCK]: 'Bricks',
    [ItemID.SANDSTONE_BLOCK]: 'Sandstone',
    [ItemID.GOLD_BLOCK]: 'Block of Gold',
    [ItemID.BEDROCK_BLOCK]: 'Bedrock',
    [ItemID.IRON_BLOCK]: 'Block of Iron',
    [ItemID.STICK]: 'Stick',
    [ItemID.IRON_INGOT]: 'Iron Ingot',
    [ItemID.GOLD_INGOT]: 'Gold Ingot',
    [ItemID.WOODEN_PICKAXE]: 'Wooden Pickaxe',
    [ItemID.STONE_PICKAXE]: 'Stone Pickaxe',
    [ItemID.IRON_PICKAXE]: 'Iron Pickaxe',
    [ItemID.GOLD_PICKAXE]: 'Gold Pickaxe',
    [ItemID.WOODEN_AXE]: 'Wooden Axe',
    [ItemID.STONE_AXE]: 'Stone Axe',
    [ItemID.IRON_AXE]: 'Iron Axe',
    [ItemID.GOLD_AXE]: 'Gold Axe',
    [ItemID.WOODEN_SHOVEL]: 'Wooden Shovel',
    [ItemID.STONE_SHOVEL]: 'Stone Shovel',
    [ItemID.IRON_SHOVEL]: 'Iron Shovel',
    [ItemID.GOLD_SHOVEL]: 'Gold Shovel',
    [ItemID.WOODEN_SWORD]: 'Wooden Sword',
    [ItemID.STONE_SWORD]: 'Stone Sword',
    [ItemID.IRON_SWORD]: 'Iron Sword',
    [ItemID.GOLD_SWORD]: 'Gold Sword',
    [ItemID.CRAFTING_TABLE]: 'Crafting Table',
    [ItemID.BED]: 'Bed',
    [ItemID.WOOL]: 'Wool'
};

export function getItemName(id: ItemID): string {
    return itemNames[id] || 'Unknown Item';
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
