import { ItemID, InventorySlot } from './Items';

// Recipe: 2D array of required ItemIDs (e.g. 3x3 or 2x2 grid)
// Result: Output ItemID and Count
export interface CraftingRecipe {
    pattern: ItemID[][];
    result: { item: ItemID, count: number };
    requiresCraftingTable?: boolean;
}

export const Recipes: CraftingRecipe[] = [
    {
        // Wood to Planks
        pattern: [[ItemID.WOOD_BLOCK]],
        result: { item: ItemID.WOOD_PLANKS_BLOCK, count: 4 },
        requiresCraftingTable: false
    },
    {
        // Planks to Sticks
        pattern: [
            [ItemID.WOOD_PLANKS_BLOCK],
            [ItemID.WOOD_PLANKS_BLOCK]
        ],
        result: { item: ItemID.STICK, count: 4 },
        requiresCraftingTable: false
    },
    {
        // Crafting Table
        pattern: [
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK],
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK]
        ],
        result: { item: ItemID.CRAFTING_TABLE, count: 1 },
        requiresCraftingTable: false
    },
    // PICKAXES
    {
        pattern: [
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.WOODEN_PICKAXE, count: 1 },
        requiresCraftingTable: true
    },
    {
        pattern: [
            [ItemID.COBBLESTONE_BLOCK, ItemID.COBBLESTONE_BLOCK, ItemID.COBBLESTONE_BLOCK],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.STONE_PICKAXE, count: 1 },
        requiresCraftingTable: true
    },
    {
        pattern: [
            [ItemID.IRON_INGOT, ItemID.IRON_INGOT, ItemID.IRON_INGOT],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.IRON_PICKAXE, count: 1 },
        requiresCraftingTable: true
    },
    {
        pattern: [
            [ItemID.GOLD_INGOT, ItemID.GOLD_INGOT, ItemID.GOLD_INGOT],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.GOLD_PICKAXE, count: 1 },
        requiresCraftingTable: true
    },
    // AXES
    {
        pattern: [
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK, ItemID.NONE],
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.WOODEN_AXE, count: 1 },
        requiresCraftingTable: true
    },
    // SHOVELS
    {
        pattern: [
            [ItemID.NONE, ItemID.WOOD_PLANKS_BLOCK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.WOODEN_SHOVEL, count: 1 },
        requiresCraftingTable: true
    },
    // SWORDS
    {
        pattern: [
            [ItemID.NONE, ItemID.WOOD_PLANKS_BLOCK, ItemID.NONE],
            [ItemID.NONE, ItemID.WOOD_PLANKS_BLOCK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.WOODEN_SWORD, count: 1 },
        requiresCraftingTable: true
    },
    // BED
    {
        pattern: [
            [ItemID.WOOL, ItemID.WOOL, ItemID.WOOL],
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK]
        ],
        result: { item: ItemID.BED, count: 1 },
        requiresCraftingTable: true
    },
    {
        pattern: [[ItemID.IRON_INGOT], [ItemID.IRON_INGOT], [ItemID.IRON_INGOT]],
        result: { item: ItemID.IRON_BLOCK, count: 1 },
        requiresCraftingTable: true
    },
    {
        pattern: [[ItemID.IRON_BLOCK]],
        result: { item: ItemID.IRON_INGOT, count: 9 },
        requiresCraftingTable: false
    },
    {
        pattern: [[ItemID.GOLD_INGOT], [ItemID.GOLD_INGOT], [ItemID.GOLD_INGOT]],
        result: { item: ItemID.GOLD_BLOCK, count: 1 },
        requiresCraftingTable: true
    },
    {
        pattern: [[ItemID.GOLD_BLOCK]],
        result: { item: ItemID.GOLD_INGOT, count: 9 },
        requiresCraftingTable: false
    }
];


export class CraftingSystem {

    // Evaluate a generic grid
    public checkRecipe(grid: InventorySlot[][], isTable: boolean = false): CraftingRecipe | null {
        // Strip empty rows/cols to find the core pattern
        let minRow = grid.length, maxRow = -1, minCol = grid[0].length, maxCol = -1;

        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                if (grid[r][c].item !== ItemID.NONE) {
                    if (r < minRow) minRow = r;
                    if (r > maxRow) maxRow = r;
                    if (c < minCol) minCol = c;
                    if (c > maxCol) maxCol = c;
                }
            }
        }

        if (minRow > maxRow) return null; // Empty grid

        const patternWidth = maxCol - minCol + 1;
        const patternHeight = maxRow - minRow + 1;

        for (const recipe of Recipes) {
            // Check table requirement
            if (recipe.requiresCraftingTable && !isTable) continue;

            const rHeight = recipe.pattern.length;
            const rWidth = recipe.pattern[0].length;

            if (rWidth !== patternWidth || rHeight !== patternHeight) continue;

            let matches = true;
            for (let r = 0; r < rHeight; r++) {
                for (let c = 0; c < rWidth; c++) {
                    if (grid[minRow + r][minCol + c].item !== recipe.pattern[r][c]) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) break;
            }

            if (matches) return recipe;
        }

        return null;
    }
}
