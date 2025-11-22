import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
        });

        // Default material
        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
            friction: 0.3,
            restitution: 0.3,
        });
        this.world.addContactMaterial(defaultContactMaterial);

        // Materials
        this.groundMat = new CANNON.Material('ground');
        this.deckMat = new CANNON.Material('deck');
        this.fingerMat = new CANNON.Material('finger');

        // Contact Materials
        // Ground vs Deck (Sliding/Rolling)
        const groundDeckContact = new CANNON.ContactMaterial(this.groundMat, this.deckMat, {
            friction: 0.3,
            restitution: 0.3
        });
        this.world.addContactMaterial(groundDeckContact);

        // Finger vs Deck (High Friction / Grip)
        const fingerDeckContact = new CANNON.ContactMaterial(this.fingerMat, this.deckMat, {
            friction: 10.0, // High friction for grip
            restitution: 0.0
        });
        this.world.addContactMaterial(fingerDeckContact);

        this.initGround();
        this.createBoundaries(10, 10); // 10x10 arena
    }

    initGround() {
        const groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
            material: this.groundMat
        });
        // Cannon plane is facing +Z, rotate it to face +Y
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
    }

    createBoundaries(width, depth) {
        const halfWidth = width / 2;
        const halfDepth = depth / 2;
        const wallThickness = 1;
        const wallHeight = 10;

        const wallShape = new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight, depth));
        const wallShapeZ = new CANNON.Box(new CANNON.Vec3(width, wallHeight, wallThickness));

        // Left Wall (-X)
        const leftWall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShape });
        leftWall.position.set(-halfWidth - wallThickness, wallHeight / 2, 0);
        this.world.addBody(leftWall);

        // Right Wall (+X)
        const rightWall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShape });
        rightWall.position.set(halfWidth + wallThickness, wallHeight / 2, 0);
        this.world.addBody(rightWall);

        // Back Wall (-Z)
        const backWall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShapeZ });
        backWall.position.set(0, wallHeight / 2, -halfDepth - wallThickness);
        this.world.addBody(backWall);

        // Front Wall (+Z)
        const frontWall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShapeZ });
        frontWall.position.set(0, wallHeight / 2, halfDepth + wallThickness);
        this.world.addBody(frontWall);
    }

    update(deltaTime) {
        // Fixed time step
        this.world.fixedStep();
    }

    addBody(body) {
        this.world.addBody(body);
    }

    removeBody(body) {
        this.world.removeBody(body);
    }
}
