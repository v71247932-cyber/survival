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
    {
        // Wooden Pickaxe
        pattern: [
            [ItemID.WOOD_PLANKS_BLOCK, ItemID.WOOD_PLANKS_BLOCK],
            [ItemID.NONE, ItemID.STICK],
            [ItemID.NONE, ItemID.STICK]
        ],
        result: { item: ItemID.WOODEN_PICKAXE, count: 1 }
    },
    {
        // Stone Pickaxe
        pattern: [
            [ItemID.COBBLESTONE_BLOCK, ItemID.COBBLESTONE_BLOCK],
            [ItemID.NONE, ItemID.STICK],
            [ItemID.NONE, ItemID.STICK]
        ],
        result: { item: ItemID.STONE_PICKAXE, count: 1 }
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
