import { InventorySlot } from '../gameplay/Items';

export interface WorldSaveData {
    seed: string;
    modifiedBlocks: { [key: string]: number };
    player: {
        position: { x: number, y: number, z: number };
        rotation: { y: number };
        health: number;
        hunger: number;
        inventory: {
            hotbar: InventorySlot[];
            main: InventorySlot[];
        };
    };
    timestamp: number;
}

export class SaveManager {
    private static SAVE_PREFIX = 'survival_save_';

    public static saveWorld(realmName: string, data: WorldSaveData) {
        try {
            const key = this.SAVE_PREFIX + realmName;
            localStorage.setItem(key, JSON.stringify(data));

            // Update list of saved worlds
            this.updateSaveList(realmName);
            console.log(`[SaveManager] World "${realmName}" saved.`);
        } catch (e) {
            console.error('[SaveManager] Failed to save world:', e);
        }
    }

    public static loadWorld(realmName: string): WorldSaveData | null {
        try {
            const key = this.SAVE_PREFIX + realmName;
            const data = localStorage.getItem(key);
            if (!data) return null;
            return JSON.parse(data) as WorldSaveData;
        } catch (e) {
            console.error('[SaveManager] Failed to load world:', e);
            return null;
        }
    }

    public static deleteWorld(realmName: string) {
        const key = this.SAVE_PREFIX + realmName;
        localStorage.removeItem(key);
        this.removeFromSaveList(realmName);
    }

    public static getSavedRealms(): string[] {
        const list = localStorage.getItem('survival_save_list');
        return list ? JSON.parse(list) : [];
    }

    private static updateSaveList(realmName: string) {
        let list = this.getSavedRealms();
        if (!list.includes(realmName)) {
            list.push(realmName);
            localStorage.setItem('survival_save_list', JSON.stringify(list));
        }
    }

    private static removeFromSaveList(realmName: string) {
        let list = this.getSavedRealms();
        const index = list.indexOf(realmName);
        if (index > -1) {
            list.splice(index, 1);
            localStorage.setItem('survival_save_list', JSON.stringify(list));
        }
    }

    public static saveTransitState(data: any) {
        localStorage.setItem('survival_transit_state', JSON.stringify({
            ...data,
            timestamp: Date.now()
        }));
    }

    public static loadTransitState(): any | null {
        const data = localStorage.getItem('survival_transit_state');
        if (!data) return null;
        try {
            const parsed = JSON.parse(data);
            if (Date.now() - parsed.timestamp > 300000) { // 5 min expiry
                this.clearTransitState();
                return null;
            }
            return parsed;
        } catch (e) {
            return null;
        }
    }

    public static clearTransitState() {
        localStorage.removeItem('survival_transit_state');
    }
}
