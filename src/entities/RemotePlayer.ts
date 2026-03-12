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

        // Simple visual representation: Box for body, box for head
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshLambertMaterial({ color: 0x3366cc });

        const bodyMesh = new THREE.Mesh(bodyGeo, material);
        bodyMesh.position.y = 0.6; // shift up
        bodyMesh.castShadow = true;

        const headMesh = new THREE.Mesh(headGeo, material);
        headMesh.position.y = 1.45;
        headMesh.castShadow = true;

        this.group.add(bodyMesh);
        this.group.add(headMesh);

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
