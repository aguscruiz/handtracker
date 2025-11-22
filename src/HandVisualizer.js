import * as THREE from 'three'

export class HandVisualizer {
    constructor(world) {
        this.world = world
        this.fingers = {}
        this.initMeshes()
    }

    initMeshes() {
        const geometry = new THREE.SphereGeometry(0.05, 16, 16)
        const material = new THREE.MeshStandardMaterial({
            color: 0xffccaa, // Skin tone-ish
            roughness: 0.5
        })

        // Create meshes for Index (8) and Middle (12) finger tips
        this.fingers[8] = new THREE.Mesh(geometry, material)
        this.fingers[12] = new THREE.Mesh(geometry, material)

        this.world.scene.add(this.fingers[8])
        this.world.scene.add(this.fingers[12])
    }

    update(handData) {
        if (!handData) {
            // Hide if no hand detected
            this.fingers[8].visible = false
            this.fingers[12].visible = false
            return
        }

        this.fingers[8].visible = true
        this.fingers[12].visible = true

        this.updateFingerPosition(8, handData[8])
        this.updateFingerPosition(12, handData[12])
    }

    updateFingerPosition(index, landmark) {
        // Map MediaPipe (0-1) to World Coordinates
        // Must match the mapping in Skateboard.js for consistency
        // Skateboard.js:
        // const targetX = (0.5 - centerX) * 10 
        // const targetZ = (centerY - 0.5) * 10

        const x = (0.5 - landmark.x) * 10
        // Y in 3D is up/down. MediaPipe Y is top-down. 
        // We want fingers to hover above the board.
        // Let's map Z (depth) from MediaPipe to Y (height) in 3D?
        // Or just keep them at a fixed height for now?
        // Let's try to map MediaPipe Y to Z (depth in 3D) like the board
        const z = (landmark.y - 0.5) * 10

        // For height (Y), we can use a fixed offset or try to use landmark.z (if available/reliable)
        // MediaPipe Z is relative to wrist.
        // The board is roughly at y=0.1 on the ground.
        // Let's put fingers just above it.
        const y = 0.15

        this.fingers[index].position.set(x, y, z)
    }
}
