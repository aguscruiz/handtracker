import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
];

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

    // MediaPipe returns normalized coordinates (0-1)
    // Map them to world space for Three.js
    
    for (let i = 0; i < this.joints.length; i++) {
      const lm = handLandmarks[i];
      
      // Mapping:
      // X: Invert to mirror, shift center
      // Y: Invert (canvas is top-left origin, 3D is center origin)
      // Z: Scale depth
      
      const x = (lm.x - 0.5) * -10;
      const y = (lm.y - 0.5) * -10;
      const z = (lm.z) * -10;

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
}

