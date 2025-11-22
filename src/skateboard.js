import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Skateboard {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.body = null;
        this.createModel();
    }

    initPhysics(physicsWorld) {
        // Create physics body
        const shape = new CANNON.Box(new CANNON.Vec3(0.75, 0.05, 2.0)); // Half extents
        this.body = new CANNON.Body({
            mass: 1, // Dynamic body
            shape: shape,
            position: new CANNON.Vec3(0, 2, 0), // Start in air
            material: physicsWorld.deckMat
        });

        // Add wheels (simplified as spheres for physics to allow rolling)
        // Actually, a box is fine for sliding, but for rolling we need wheels.
        // Let's stick to a box for the deck for now to keep it stable, 
        // maybe add a material with low friction.

        physicsWorld.addBody(this.body);
    }

    createModel() {
        this.mesh = new THREE.Group();

        // Curved Deck using ExtrudeGeometry
        const length = 4.0;
        const width = 1.5;
        const thickness = 0.1;
        const curveHeight = 0.3; // How much nose/tail curve up

        const shape = new THREE.Shape();
        // Draw side profile of the deck
        // Start at back tail
        shape.moveTo(-length / 2, curveHeight);
        // Curve down to flat part
        shape.bezierCurveTo(-length / 2 + 0.5, curveHeight, -length / 2 + 0.8, 0, -length / 4, 0);
        // Flat middle
        shape.lineTo(length / 4, 0);
        // Curve up to nose
        shape.bezierCurveTo(length / 2 - 0.8, 0, length / 2 - 0.5, curveHeight, length / 2, curveHeight);
        // Close shape (thickness)
        shape.lineTo(length / 2, curveHeight - thickness);
        shape.bezierCurveTo(length / 2 - 0.5, curveHeight - thickness, length / 2 - 0.8, -thickness, length / 4, -thickness);
        shape.lineTo(-length / 4, -thickness);
        shape.bezierCurveTo(-length / 2 + 0.8, -thickness, -length / 2 + 0.5, curveHeight - thickness, -length / 2, curveHeight - thickness);
        shape.lineTo(-length / 2, curveHeight);

        const extrudeSettings = {
            steps: 1,
            depth: width,
            bevelEnabled: false
        };

        const deckGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Center the geometry
        deckGeometry.center();
        // Rotate to align with Z axis (length)
        deckGeometry.rotateY(Math.PI / 2);

        const deckMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // SaddleBrown
            roughness: 0.8
        });
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        deck.castShadow = true;
        deck.receiveShadow = true;
        this.mesh.add(deck);

        // Grip tape (black top) - Simplified as a slightly scaled up plane on top
        // Or just color the top faces of the geometry?
        // Let's add a plane that follows the curve? Hard.
        // Let's just use a dark color for the top of the deck material?
        // For now, let's make the top face black.

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const positions = [
            { x: -0.5, y: -0.2, z: 1.2 },
            { x: 0.5, y: -0.2, z: 1.2 },
            { x: -0.5, y: -0.2, z: -1.2 },
            { x: 0.5, y: -0.2, z: -1.2 }
        ];

        positions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            this.mesh.add(wheel);
        });

        // Trucks (simplified)
        const truckGeometry = new THREE.BoxGeometry(1.0, 0.1, 0.2);
        const truckMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

        const truck1 = new THREE.Mesh(truckGeometry, truckMaterial);
        truck1.position.set(0, -0.1, 1.2);
        this.mesh.add(truck1);

        const truck2 = new THREE.Mesh(truckGeometry, truckMaterial);
        truck2.position.set(0, -0.1, -1.2);
        this.mesh.add(truck2);

        this.scene.add(this.mesh);
        this.mesh.visible = false; // Hide initially until hands are detected
    }

    update() {
        if (this.mesh && this.body) {
            this.mesh.visible = true;
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
        }
    }

    applyAdhesion(targetPos) {
        if (!this.body) return;

        // Apply force towards target position
        // F = k * (target - current) - damping * velocity
        const strength = 150; // Spring stiffness
        const damping = 10;

        const currentPos = this.body.position;
        const force = new CANNON.Vec3()
            .copy(targetPos)
            .vsub(currentPos)
            .scale(strength);

        // Subtract damping
        force.vsub(this.body.velocity.scale(damping), force);

        // Apply to center of mass (or maybe slightly offset to top?)
        // Applying to center for stability first
        this.body.applyForce(force, currentPos);
    }

    checkTricks(handRig) {
        if (!this.body) return;

        // Ollie Logic
        // Detect rapid downward movement of Middle Finger (Tail)
        // Middle Tip is joint 12
        const middleTipVel = handRig.getVelocity(); // This is palm velocity, need tip velocity?
        // HandRig doesn't expose tip velocity directly, but we can infer from palm for now or add it.
        // Let's use palm velocity as a proxy for "hand moving down".

        // Also check if board is on ground (y ~ 0)
        const isGrounded = this.body.position.y < 0.5;

        if (isGrounded && middleTipVel.y < -5.0) { // Threshold for "Pop"
            // Apply Pop Force
            // Upward force + Rotation (lift nose)
            const popForce = new CANNON.Vec3(0, 15, 0);
            const popTorque = new CANNON.Vec3(5, 0, 0); // Rotate around X axis (pitch)

            this.body.applyImpulse(popForce, this.body.position);
            this.body.applyTorque(popTorque);

            console.log("Ollie!");
        }
    }
}
