import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
];

const BOUNDARIES = {
  minX: -5, maxX: 5,
  minY: 0, maxY: 5,
  minZ: -5, maxZ: 5
};

export class HandRig {
  constructor(scene) {
    this.scene = scene;
    this.loadedModel = null;
    this.joints = [];
    this.bones = [];

    // Group to hold the hand
    this.handGroup = new THREE.Group();
    this.scene.add(this.handGroup);

    this.createPlaceholderHand();

    this.physicsBodies = {};

    this.isGrabbing = false;
    this.previousPalmPosition = new THREE.Vector3();
    this.palmVelocity = new THREE.Vector3();
    this.lastUpdateTime = 0;
  }

  initPhysics(physicsWorld) {
    // Create kinematic bodies for Index (8) and Middle (12) tips
    const shape = new CANNON.Sphere(0.15); // Slightly larger than visual

    [8, 12].forEach(index => {
      const body = new CANNON.Body({
        mass: 0, // Kinematic (infinite mass)
        type: CANNON.Body.KINEMATIC,
        shape: shape,
        position: new CANNON.Vec3(0, -10, 0), // Start away
        material: physicsWorld.fingerMat
      });
      physicsWorld.addBody(body);
      this.physicsBodies[index] = body;
    });
  }

  createPlaceholderHand() {
    const jointGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const jointMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    const boneGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    const boneMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Create 21 joints
    for (let i = 0; i < 21; i++) {
      const joint = new THREE.Mesh(jointGeometry, jointMaterial);
      this.handGroup.add(joint);
      this.joints.push(joint);
    }

    // Create bones (connections)
    for (let i = 0; i < CONNECTIONS.length; i++) {
      const bone = new THREE.Mesh(boneGeometry, boneMaterial.clone());
      this.handGroup.add(bone);
      this.bones.push({
        mesh: bone,
        from: CONNECTIONS[i][0],
        to: CONNECTIONS[i][1]
      });
    }
  }

  update(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      // Don't hide immediately to avoid flickering, or handle gracefully
      return;
    }

    this.handGroup.visible = true;
    const handLandmarks = landmarks[0]; // Assuming one hand for now
    // Map them to world space for Three.js

    for (let i = 0; i < this.joints.length; i++) {
      const lm = handLandmarks[i];

      // Mapping:
      // X: Invert to mirror, shift center
      // Y: Invert (canvas is top-left origin, 3D is center origin)
      // Z: Scale depth

      let x = (lm.x - 0.5) * -10;
      let y = (lm.y - 0.5) * -10;
      let z = (lm.z) * -10;

      // Clamp to boundaries
      x = Math.max(BOUNDARIES.minX, Math.min(BOUNDARIES.maxX, x));
      y = Math.max(BOUNDARIES.minY, Math.min(BOUNDARIES.maxY, y));
      z = Math.max(BOUNDARIES.minZ, Math.min(BOUNDARIES.maxZ, z));

      this.joints[i].position.set(x, y, z);
    }

    // Update bones
    for (const bone of this.bones) {
      const start = this.joints[bone.from].position;
      const end = this.joints[bone.to].position;

      const distance = start.distanceTo(end);

      // Position is midpoint
      bone.mesh.position.copy(start).lerp(end, 0.5);

      // Scale to length
      bone.mesh.scale.set(1, distance, 1);

      // Rotate to look at end
      bone.mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        end.clone().sub(start).normalize()
      );
    }
    // Update physics bodies
    if (this.physicsBodies[8] && this.joints[8]) {
      this.physicsBodies[8].position.copy(this.joints[8].position);
    }
    if (this.physicsBodies[12] && this.joints[12]) {
      this.physicsBodies[12].position.copy(this.joints[12].position);
    }

    // Detect Grab (Index and Middle Curl)
    // Check distance of Index Tip (8) to Index MCP (5)
    // Check distance of Middle Tip (12) to Middle MCP (9)

    const indexTip = this.joints[8].position;
    const indexMCP = this.joints[5].position;
    const middleTip = this.joints[12].position;
    const middleMCP = this.joints[9].position;

    const indexDist = indexTip.distanceTo(indexMCP);
    const middleDist = middleTip.distanceTo(middleMCP);

    // Threshold: 
    // Open finger is ~1.5 - 2 units
    // Curled is < 1.0 (roughly)
    const CURL_THRESHOLD = 1.2;

    this.isGrabbing = indexDist < CURL_THRESHOLD && middleDist < CURL_THRESHOLD;

    // Calculate Velocity
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;

    if (deltaTime > 0) {
      const currentPalmPos = this.getPalmPosition();
      if (currentPalmPos) {
        this.palmVelocity.copy(currentPalmPos).sub(this.previousPalmPosition).divideScalar(deltaTime);
        this.previousPalmPosition.copy(currentPalmPos);
      }
    }
    this.lastUpdateTime = currentTime;
  }

  async loadModel(url) {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(url);
      // Hide placeholder
      this.joints.forEach(j => j.visible = false);
      this.bones.forEach(b => b.mesh.visible = false);

      this.loadedModel = gltf.scene;
      this.handGroup.add(this.loadedModel);

      console.log("Model loaded", gltf);
    } catch (error) {
      console.error("Failed to load model", error);
    }
  }
  getJointPosition(index) {
    if (this.joints[index]) {
      return this.joints[index].position.clone();
    }
    return null;
  }

  getPalmPosition() {
    // Use midpoint of Index Tip (8) and Middle Tip (12)
    if (this.joints[8] && this.joints[12]) {
      return new THREE.Vector3()
        .copy(this.joints[8].position)
        .add(this.joints[12].position)
        .multiplyScalar(0.5);
    }
    return null;
  }

  getVelocity() {
    return this.palmVelocity.clone();
  }
}
