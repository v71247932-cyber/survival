import * as THREE from 'three';

export class RemotePlayer {
    public id: string;
    public username: string;
    public group: THREE.Group;

    private usernameSprite: THREE.Sprite | null = null;

    // Interpolation targets
    private targetPos = new THREE.Vector3();
    private targetRotY = 0;

    constructor(id: string, username: string, position: { x: number, y: number, z: number }) {
        this.id = id;
        this.username = username;

        this.group = new THREE.Group();
        this.targetPos.set(position.x, position.y, position.z);
        this.group.position.copy(this.targetPos);

        // --- Character Skin Geometry (2 blocks high total) ---
        const skinColor = 0xe0ac69; // Peach/Skin
        const shirtColor = 0x3366cc; // Blue
        const pantsColor = 0x5a3d2b; // Brown
        const hairColor = 0x3e2723; // Dark Brown

        // Head (0.4 x 0.4 x 0.4)
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshLambertMaterial({ color: skinColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6; // Top of the model
        head.castShadow = true;

        // Hair (0.42 x 0.15 x 0.42) - Slightly larger to overlay head
        const hairGeo = new THREE.BoxGeometry(0.42, 0.15, 0.42);
        const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.75;
        this.group.add(hair);

        // Torso (0.6 x 0.7 x 0.3)
        const torsoGeo = new THREE.BoxGeometry(0.6, 0.7, 0.3);
        const torsoMat = new THREE.MeshLambertMaterial({ color: shirtColor });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 1.05; // Center of torso
        torso.castShadow = true;

        // Arms (0.2 x 0.7 x 0.2)
        const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const leftArm = new THREE.Mesh(armGeo, torsoMat);
        leftArm.position.set(-0.4, 1.05, 0);
        leftArm.castShadow = true;

        const rightArm = new THREE.Mesh(armGeo, torsoMat);
        rightArm.position.set(0.4, 1.05, 0);
        rightArm.castShadow = true;

        // Legs (0.25 x 0.7 x 0.25)
        const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        const legMat = new THREE.MeshLambertMaterial({ color: pantsColor });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.15, 0.35, 0);
        leftLeg.castShadow = true;

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.15, 0.35, 0);
        rightLeg.castShadow = true;

        this.group.add(head);
        this.group.add(torso);
        this.group.add(leftArm);
        this.group.add(rightArm);
        this.group.add(leftLeg);
        this.group.add(rightLeg);

        this.createNameplate();
    }

    private createNameplate() {
        // Create simple text canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '24px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.username, canvas.width / 2, canvas.height / 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
        this.usernameSprite = new THREE.Sprite(material);
        // Make sure sprite is rendered on top
        this.usernameSprite.renderOrder = 999;

        this.usernameSprite.position.y = 2.2;
        this.usernameSprite.scale.set(1.5, 0.375, 1);

        this.group.add(this.usernameSprite);
    }

    public setTarget(position: { x: number, y: number, z: number }, rotation: { y: number }) {
        this.targetPos.set(position.x, position.y, position.z);
        this.targetRotY = rotation.y;
    }

    public update(delta: number) {
        // Interpolate position and rotation
        this.group.position.lerp(this.targetPos, delta * 10.0);

        // Simple rotationlerp (doesn't handle wraparound well in this simple form, but passable for prototype)
        this.group.rotation.y += (this.targetRotY - this.group.rotation.y) * delta * 10.0;
    }

    public dispose() {
        if (this.usernameSprite && this.usernameSprite.material instanceof THREE.Material) {
            if (this.usernameSprite.material.map) this.usernameSprite.material.map.dispose();
            this.usernameSprite.material.dispose();
        }
        // Iterate children to dispose geo/mats
        this.group.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
    }
}
