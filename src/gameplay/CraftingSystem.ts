import { ItemID, InventorySlot } from './Items';

// Recipe: 2D array of required ItemIDs (e.g. 3x3 or 2x2 grid)
// Result: Output ItemID and Count
export interface CraftingRecipe {
    pattern: ItemID[][];
    result: { item: ItemID, count: number };
}

export const Recipes: CraftingRecipe[] = [
    {
        // Wood to Planks
        pattern: [[ItemID.WOOD_BLOCK]],
        result: { item: ItemID.WOOD_PLANKS_BLOCK, count: 4 }
    },
    {
        // Planks to Sticks
        pattern: [
            [ItemID.WOOD_PLANKS_BLOCK],
            [ItemID.WOOD_PLANKS_BLOCK]
        ],
        result: { item: ItemID.STICK, count: 4 }
    },
    // PICKAXES
    {
        pattern: [
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.WOODEN_PICKAXE, count: 1 }
    },
    {
        pattern: [
            [ItemID.COBBLESTONE_BLOCK, ItemID.COBBLESTONE_BLOCK, ItemID.COBBLESTONE_BLOCK],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.STONE_PICKAXE, count: 1 }
    },
    {
        pattern: [
            [ItemID.IRON_INGOT, ItemID.IRON_INGOT, ItemID.IRON_INGOT],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.IRON_PICKAXE, count: 1 }
    },
    {
        pattern: [
            [ItemID.GOLD_INGOT, ItemID.GOLD_INGOT, ItemID.GOLD_INGOT],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE],
            [ItemID.NONE, ItemID.STICK, ItemID.NONE]
        ],
        result: { item: ItemID.GOLD_PICKAXE, count: 1 }
    },
    // AXES
    {
        pattern: [
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK],
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.STICK],
            [ItemID.NONE, ItemID.STICK]
        ],
        result: { item: ItemID.WOODEN_AXE, count: 1 }
    },
    {
        pattern: [
            [ItemID.COBBLESTONE_BLOCK, ItemID.COBBLESTONE_BLOCK],
            [ItemID.COBBLESTONE_BLOCK, ItemID.STICK],
            [ItemID.NONE, ItemID.STICK]
        ],
        result: { item: ItemID.STONE_AXE, count: 1 }
    },
    {
        pattern: [
            [ItemID.IRON_INGOT, ItemID.IRON_INGOT],
            [ItemID.IRON_INGOT, ItemID.STICK],
            [ItemID.NONE, ItemID.STICK]
        ],
        result: { item: ItemID.IRON_AXE, count: 1 }
    },
    // SHOVELS
    {
        pattern: [[ItemID.WOOD_PLANKS_BLOCK], [ItemID.STICK], [ItemID.STICK]],
        result: { item: ItemID.WOODEN_SHOVEL, count: 1 }
    },
    {
        pattern: [[ItemID.COBBLESTONE_BLOCK], [ItemID.STICK], [ItemID.STICK]],
        result: { item: ItemID.STONE_SHOVEL, count: 1 }
    },
    {
        pattern: [[ItemID.IRON_INGOT], [ItemID.STICK], [ItemID.STICK]],
        result: { item: ItemID.IRON_SHOVEL, count: 1 }
    },
    // SWORDS
    {
        pattern: [[ItemID.WOOD_PLANKS_BLOCK], [ItemID.WOOD_PLANKS_BLOCK], [ItemID.STICK]],
        result: { item: ItemID.WOODEN_SWORD, count: 1 }
    },
    {
        pattern: [[ItemID.COBBLESTONE_BLOCK], [ItemID.COBBLESTONE_BLOCK], [ItemID.STICK]],
        result: { item: ItemID.STONE_SWORD, count: 1 }
    },
    {
        pattern: [[ItemID.IRON_INGOT], [ItemID.IRON_INGOT], [ItemID.STICK]],
        result: { item: ItemID.IRON_SWORD, count: 1 }
    },
    {
        pattern: [[ItemID.IRON_INGOT], [ItemID.IRON_INGOT], [ItemID.IRON_INGOT]],
        result: { item: ItemID.IRON_BLOCK, count: 1 }
    },
    {
        pattern: [[ItemID.IRON_BLOCK]],
        result: { item: ItemID.IRON_INGOT, count: 9 }
    },
    {
        pattern: [[ItemID.GOLD_INGOT], [ItemID.GOLD_INGOT], [ItemID.GOLD_INGOT]],
        result: { item: ItemID.GOLD_BLOCK, count: 1 }
    },
    {
        pattern: [[ItemID.GOLD_BLOCK]],
        result: { item: ItemID.GOLD_INGOT, count: 9 }
    }
];

export class CraftingSystem {

    // Evaluate a generic 3x3 grid
    public checkRecipe(grid: InventorySlot[][]): CraftingRecipe | null {
        // Strip empty rows/cols to find the core pattern
        let minRow = 3, maxRow = -1, minCol = 3, maxCol = -1;

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
