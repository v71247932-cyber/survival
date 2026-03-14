import * as THREE from 'three';

export class RemotePlayer {
    public id: string;
    public username: string;
    public group: THREE.Group;

    private usernameSprite: THREE.Sprite | null = null;
    private targetPos = new THREE.Vector3();
    private targetRotY = 0;

    constructor(id: string, username: string, position: { x: number, y: number, z: number }) {
        this.id = id;
        this.username = username;

        this.group = new THREE.Group();
        this.targetPos.set(position.x, position.y, position.z);
        this.group.position.copy(this.targetPos);

        const skinColor = 0xe0ac69;
        const shirtColor = 0x3366cc;
        const pantsColor = 0x5a3d2b;
        const hairColor = 0x3e2723;

        // Optimized character model (no shadows, simple materials)
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshLambertMaterial({ color: skinColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6;

        const hairGeo = new THREE.BoxGeometry(0.42, 0.15, 0.42);
        const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.75;
        this.group.add(hair);

        const torsoGeo = new THREE.BoxGeometry(0.6, 0.7, 0.3);
        const torsoMat = new THREE.MeshLambertMaterial({ color: shirtColor });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 1.05;

        const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const leftArm = new THREE.Mesh(armGeo, torsoMat);
        leftArm.position.set(-0.4, 1.05, 0);

        const rightArm = new THREE.Mesh(armGeo, torsoMat);
        rightArm.position.set(0.4, 1.05, 0);

        const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        const legMat = new THREE.MeshLambertMaterial({ color: pantsColor });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.15, 0.35, 0);

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.15, 0.35, 0);

        // Turn off shadows for all components for max FPS
        [head, hair, torso, leftArm, rightArm, leftLeg, rightLeg].forEach(m => {
            m.castShadow = false;
            m.receiveShadow = false;
            m.matrixAutoUpdate = false;
            m.updateMatrix();
        });

        this.group.add(head, torso, leftArm, rightArm, leftLeg, rightLeg);
        this.createNameplate();
    }

    private createNameplate() {
        const canvas = document.createElement('canvas');
        canvas.width = 128; // Reduced resolution for perf
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '16px sans-serif';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.username, canvas.width / 2, canvas.height / 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
        this.usernameSprite = new THREE.Sprite(material);
        this.usernameSprite.renderOrder = 999;
        this.usernameSprite.position.y = 2.1;
        this.usernameSprite.scale.set(1.0, 0.25, 1);
        this.group.add(this.usernameSprite);
    }

    public setTarget(position: { x: number, y: number, z: number }, rotation: { y: number }) {
        this.targetPos.set(position.x, position.y, position.z);
        this.targetRotY = rotation.y;
    }

    public update(delta: number) {
        this.group.position.lerp(this.targetPos, delta * 15.0); // Faster interpolation
        this.group.rotation.y += (this.targetRotY - this.group.rotation.y) * delta * 10.0;
        this.group.updateMatrixWorld();
    }

    public dispose() {
        if (this.usernameSprite) {
            if (this.usernameSprite.material.map) this.usernameSprite.material.map.dispose();
            this.usernameSprite.material.dispose();
        }
        this.group.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
    }
}
