import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export class Skateboard {
    constructor(world) {
        this.world = world
        this.createBody()
        this.createMesh()
    }

    createBody() {
        this.body = new CANNON.Body({
            mass: 2, // Heavier board
            position: new CANNON.Vec3(0, 0.5, 0),
            angularDamping: 0.5,
            linearDamping: 0.1
        })

        // Deck
        const deckShape = new CANNON.Box(new CANNON.Vec3(0.1, 0.02, 0.3))
        this.body.addShape(deckShape, new CANNON.Vec3(0, 0.05, 0))

        // Wheels (Spheres for smooth collision)
        const wheelShape = new CANNON.Sphere(0.03)
        const wheelY = 0
        const wheelX = 0.08
        const wheelZ = 0.18

        this.body.addShape(wheelShape, new CANNON.Vec3(-wheelX, wheelY, -wheelZ))
        this.body.addShape(wheelShape, new CANNON.Vec3(wheelX, wheelY, -wheelZ))
        this.body.addShape(wheelShape, new CANNON.Vec3(-wheelX, wheelY, wheelZ))
        this.body.addShape(wheelShape, new CANNON.Vec3(wheelX, wheelY, wheelZ))

        this.world.physicsWorld.addBody(this.body)
    }

    createMesh() {
        this.mesh = new THREE.Group()

        // Deck
        const deckGeo = new THREE.BoxGeometry(0.2, 0.04, 0.6)
        const deckMat = new THREE.MeshStandardMaterial({ color: 0xcc3333 })
        const deck = new THREE.Mesh(deckGeo, deckMat)
        deck.position.y = 0.05
        deck.castShadow = true
        this.mesh.add(deck)

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16)
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
        wheelGeo.rotateZ(Math.PI / 2)

        const positions = [
            [-0.08, 0, -0.18],
            [0.08, 0, -0.18],
            [-0.08, 0, 0.18],
            [0.08, 0, 0.18]
        ]

        positions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat)
            wheel.position.set(...pos)
            wheel.castShadow = true
            this.mesh.add(wheel)
        })

        this.world.scene.add(this.mesh)

        // Debug cursor
        const cursorGeo = new THREE.RingGeometry(0.2, 0.25, 32)
        const cursorMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 })
        this.cursor = new THREE.Mesh(cursorGeo, cursorMat)
        this.cursor.rotation.x = -Math.PI / 2
        this.cursor.position.y = 0.01
        this.world.scene.add(this.cursor)
    }

    updateInput(handData) {
        if (!handData || handData.length < 12) {
            this.cursor.visible = false
            return
        }
        this.cursor.visible = true

        const indexTip = handData[8]
        const middleTip = handData[12]

        // MediaPipe coords: x (0-1), y (0-1)
        // We want the center point between fingers
        const centerX = (indexTip.x + middleTip.x) / 2
        const centerY = (indexTip.y + middleTip.y) / 2

        // Raycasting logic to find point on ground
        // 1. Convert to NDC (-1 to +1)
        // Note: MediaPipe X is mirrored usually, so 1-x might be needed depending on setup.
        // Assuming standard webcam mirror: 
        // Screen X: 0 (left) -> 1 (right)
        // NDC X: -1 (left) -> 1 (right)
        // But webcam is mirrored, so moving hand RIGHT (screen) is actually moving LEFT in world if we treat screen as window.
        // Let's stick to: x maps to x, y maps to y for now, but invert X for mirror effect if needed.
        // Actually, let's just use the standard mapping:
        // NDC x = (x - 0.5) * 2
        // NDC y = -(y - 0.5) * 2  (Y is inverted in WebGL)

        const ndcX = (1 - centerX) * 2 - 1 // Invert X for mirror feel
        const ndcY = -(centerY) * 2 + 1

        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.world.camera)

        // Intersect with board plane (approx y=0.1)
        // Plane constant is distance from origin along normal. Normal is (0,1,0).
        // So constant should be -0.1 to be at y=0.1? No, THREE.Plane constant is negative distance from origin if normal points away?
        // Actually THREE.Plane(normal, constant) -> normal . point + constant = 0
        // If point is (0, 0.1, 0) and normal is (0, 1, 0): 0.1 + constant = 0 => constant = -0.1
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1)
        const targetPoint = new THREE.Vector3()
        raycaster.ray.intersectPlane(plane, targetPoint)

        if (targetPoint) {
            // Update cursor
            this.cursor.position.x = targetPoint.x
            this.cursor.position.z = targetPoint.z

            const targetX = targetPoint.x
            const targetZ = targetPoint.z

            // Force-based movement (Spring/PD Controller)
            // We want it to feel "tight" when close, like you're dragging it.
            const stiffness = 150 // Much stronger snap
            const damping = 10    // Reduce oscillation

            const dx = targetX - this.body.position.x
            const dz = targetZ - this.body.position.z

            // Interaction Radius
            // If within this radius, we apply force.
            // Board is ~0.6m long. 1.0m radius is generous but allows catching it.
            if (Math.abs(dx) < 1.0 && Math.abs(dz) < 1.0) {
                const fx = (dx * stiffness) - (this.body.velocity.x * damping)
                const fz = (dz * stiffness) - (this.body.velocity.z * damping)

                this.body.applyForce(new CANNON.Vec3(fx, 0, fz), this.body.position)
            }
        }

        // Rotation (Torque-based)
        const fingerDx = middleTip.x - indexTip.x
        const fingerDy = middleTip.y - indexTip.y
        const targetAngle = Math.atan2(fingerDy, fingerDx)

        // Get current rotation
        const currentRotation = new CANNON.Vec3()
        this.body.quaternion.toEuler(currentRotation)

        // Calculate angle difference (shortest path)
        let angleDiff = -targetAngle - currentRotation.y
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

        // Apply torque to rotate towards target
        // Proportional-Derivative (PD) controller for rotation
        const kp = 10 // Stiffness
        const kd = 2  // Damping
        const torqueY = (angleDiff * kp) - (this.body.angularVelocity.y * kd)

        this.body.torque.y = torqueY

        // Upright stability (keep board from flipping over too easily)
        // Apply torque to restore X/Z rotation to 0 (flat)
        const uprightStiffness = 5
        const uprightDamping = 1
        this.body.torque.x = (-currentRotation.x * uprightStiffness) - (this.body.angularVelocity.x * uprightDamping)
        this.body.torque.z = (-currentRotation.z * uprightStiffness) - (this.body.angularVelocity.z * uprightDamping)

        // --- TRICK DETECTION ---
        if (this.lastCenterY !== undefined) {
            const velY = this.lastCenterY - centerY
            const jumpThreshold = 0.03
            const isGrounded = this.body.position.y < 0.2

            if (velY > jumpThreshold && isGrounded && !this.isJumping) {
                console.log("OLLIE POP!")
                this.isJumping = true

                // Pop force
                this.body.velocity.y = 6

                // Pitch Up
                const rightDir = new CANNON.Vec3(1, 0, 0)
                rightDir.applyQuaternion(this.body.quaternion)
                const popTorque = rightDir.scale(3)
                this.body.angularVelocity.vadd(popTorque, this.body.angularVelocity)

                // Forward boost
                const forwardDir = new CANNON.Vec3(0, 0, 1)
                forwardDir.applyQuaternion(this.body.quaternion)
                const boost = forwardDir.scale(2)
                this.body.velocity.vadd(boost, this.body.velocity)

                setTimeout(() => {
                    const levelTorque = rightDir.scale(-4)
                    this.body.angularVelocity.vadd(levelTorque, this.body.angularVelocity)
                    this.isJumping = false
                }, 200)
            }
        }
        this.lastCenterY = centerY
    }

    update() {
        // Sync mesh with physics body
        this.mesh.position.copy(this.body.position)
        this.mesh.quaternion.copy(this.body.quaternion)
    }
}
