// js/building.js — Placement of building pieces in the world
import * as THREE from 'three';
import { BUILD_PIECES, ITEMS } from './data.js';
import { getTerrainHeight } from './world.js';

export class BuildingSystem {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.active = false;
        this.selectedPiece = null; // { id, item, color }
        this.ghostMesh = null;
        this.rotation = 0;
        this._initGhostMaterial();
        this._setupInput();
    }

    _initGhostMaterial() {
        this.ghostMat = new THREE.MeshLambertMaterial({
            color: 0x4ade80, transparent: true, opacity: 0.45
        });
        this.ghostMatBad = new THREE.MeshLambertMaterial({
            color: 0xef4444, transparent: true, opacity: 0.45
        });
    }

    _setupInput() {
        document.addEventListener('keydown', e => {
            if (e.code === 'KeyR' && this.active) this.rotation += Math.PI / 2;
            if (e.code === 'KeyB') this.toggle();
        });
        document.addEventListener('mousedown', e => {
            if (!this.active || !this.game.player?.isPointerLocked) return;
            if (e.button === 0) this.place();
            if (e.button === 2) this.cancel();
        });
    }

    selectPiece(type, itemId) {
        this.selectedPiece = BUILD_PIECES.find(p => p.id === type) || BUILD_PIECES[0];
        this.active = true;
        this._updateGhostMesh();
        this.game.ui?.notify(`Build mode: ${this.selectedPiece.name} (LMB place · R rotate · RMB cancel)`, 'info');
    }

    toggle() {
        if (this.active) { this.cancel(); }
        else { this.game.ui?.openPanel('buildPanel'); }
    }

    cancel() {
        this.active = false;
        if (this.ghostMesh) { this.scene.remove(this.ghostMesh); this.ghostMesh = null; }
    }

    _buildGeoForType(type) {
        switch (type) {
            case 'floor': return new THREE.BoxGeometry(4, 0.2, 4);
            case 'wall': return new THREE.BoxGeometry(4, 3, 0.3);
            case 'door': return new THREE.BoxGeometry(1.5, 3, 0.3);
            case 'roof': const g = new THREE.ConeGeometry(3.2, 2, 4); return g;
            case 'campfire': return new THREE.CylinderGeometry(0.8, 0.8, 0.3, 8);
            default: return new THREE.BoxGeometry(2, 2, 2);
        }
    }

    _updateGhostMesh() {
        if (this.ghostMesh) { this.scene.remove(this.ghostMesh); this.ghostMesh = null; }
        if (!this.selectedPiece) return;
        const geo = this._buildGeoForType(this.selectedPiece.id);
        this.ghostMesh = new THREE.Mesh(geo, this.ghostMat.clone());
        this.ghostMesh.castShadow = false;
        this.scene.add(this.ghostMesh);
    }

    update() {
        if (!this.active || !this.ghostMesh || !this.game.player) return;

        const player = this.game.player;
        const cam = player.camera;

        // Raycast forward from camera
        const ray = new THREE.Raycaster();
        ray.setFromCamera({ x: 0, y: 0 }, cam);
        const dir = ray.ray.direction;
        const origin = ray.ray.origin;

        // Find placement position 5 units ahead, snapped to terrain
        const dist = 4;
        const px = origin.x + dir.x * dist;
        const pzVal = origin.z + dir.z * dist;
        const h = getTerrainHeight(px, pzVal);

        let placeY = h;
        if (this.selectedPiece.id === 'wall' || this.selectedPiece.id === 'door') placeY = h + 1.5;
        else if (this.selectedPiece.id === 'roof') placeY = h + 5;
        else if (this.selectedPiece.id === 'floor') placeY = h + 0.1;
        else if (this.selectedPiece.id === 'campfire') placeY = h;

        // Snap to grid
        const snap = 4;
        const snapX = Math.round(px / snap) * snap;
        const snapZ = Math.round(pzVal / snap) * snap;

        this.ghostMesh.position.set(snapX, placeY, snapZ);
        this.ghostMesh.rotation.y = this.rotation;

        // Check if we have the item
        const hasItem = this.game.inventory?.hasItem(this.selectedPiece.item, 1);
        this.ghostMesh.material.color.setHex(hasItem ? 0x4ade80 : 0xef4444);
    }

    place() {
        if (!this.selectedPiece || !this.ghostMesh) return;
        const inv = this.game.inventory;
        if (!inv.hasItem(this.selectedPiece.item, 1)) {
            this.game.ui?.notify(`Need ${ITEMS[this.selectedPiece.item]?.name} to place!`, 'danger');
            return;
        }
        inv.removeItem(this.selectedPiece.item, 1);
        const pos = this.ghostMesh.position.clone();
        const rot = this.rotation;
        this.game.world?.placePiece(this.selectedPiece.id, pos, rot, this.selectedPiece.color);
        this.game.ui?.notify(`✅ Placed ${this.selectedPiece.name}`);

        // Auto-cancel if no more items
        if (!inv.hasItem(this.selectedPiece.item, 1)) {
            this.cancel();
        }
    }
}
