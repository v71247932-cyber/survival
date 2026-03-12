import * as THREE from 'three';

// Procedurally generate simple retro pixel art textures
export function generateTexture(pattern: 'noise' | 'grass-side' | 'wood-top', colorStr: string, noiseIntensity = 15, isLeaves = false): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = colorStr;
    ctx.fillRect(0, 0, 16, 16);

    // Add noise to simulate pixel art
    for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
            if (isLeaves && Math.random() < 0.25) {
                ctx.clearRect(x, y, 1, 1);
                continue;
            }

            const r = (Math.random() - 0.5) * noiseIntensity * 2;
            const dark = r < 0;
            ctx.fillStyle = `rgba(${dark ? 0 : 255}, ${dark ? 0 : 255}, ${dark ? 0 : 255}, ${Math.abs(r) / 255})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    if (pattern === 'grass-side') {
        // Draw some green on the top edge
        ctx.fillStyle = '#4C8A36';
        for (let x = 0; x < 16; x++) {
            const depth = 2 + Math.floor(Math.random() * 3);
            ctx.fillRect(x, 0, 1, depth);
        }
    } else if (pattern === 'wood-top') {
        // Draw rings
        ctx.strokeStyle = '#ce9e64';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(8, 8, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(8, 8, 6, 0, Math.PI * 2);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

export function createBlockMaterials(): THREE.Material[] {
    return [
        new THREE.MeshLambertMaterial({ visible: false }), // 0: AIR

        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#4C8A36', 15) }), // 1: Grass Top
        new THREE.MeshLambertMaterial({ map: generateTexture('grass-side', '#63452C', 15) }), // 2: Grass Side
        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#63452C', 15) }), // 3: Dirt Bottom

        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#7D7D7D', 25) }), // 4: Stone

        new THREE.MeshLambertMaterial({ map: generateTexture('wood-top', '#8f683f', 10) }), // 5: Wood Top
        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#4a3320', 20) }), // 6: Wood Bark

        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#2F6D17', 25, true), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }), // 7: Leaves

        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#DCCC8B', 15) }), // 8: Sand

        new THREE.MeshLambertMaterial({ color: 0x3366ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }), // 9: Water

        new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide }), // 10: Glass

        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#5b5b5b', 20) }), // 11: Cobblestone
        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#a07c4e', 10) }), // 12: Wood Planks
        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#827f7a', 25) }), // 13: Gravel
        new THREE.MeshLambertMaterial({ map: generateTexture('noise', '#9b3c3c', 15) }) // 14: Bricks
    ];
}
