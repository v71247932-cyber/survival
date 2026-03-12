import { ItemID, InventorySlot } from './Items';

// Recipe: 2D array of required ItemIDs (e.g. 3x3 or 2x2 grid)
// Result: Output ItemID and Count
export interface CraftingRecipe {
    pattern: ItemID[][];
    result: { item: ItemID, count: number };
}

export const Recipes: CraftingRecipe[] = [
    {
        // Wood to Planks (fictional recipe for demo: wood block -> 4 wood blocks, normally it's log to planks)
        pattern: [[ItemID.WOOD_BLOCK]],
        result: { item: ItemID.WOOD_BLOCK, count: 4 } // Simplification since we don't have planks yet
    },
    {
        // Wooden Pickaxe (Top row wood, middle stick, bottom stick) - simplified to just wood vertically
        pattern: [
            [ItemID.WOOD_BLOCK],
            [ItemID.WOOD_BLOCK]
        ],
        result: { item: ItemID.WOODEN_PICKAXE, count: 1 }
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
