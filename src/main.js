import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { HandTracker } from './tracker.js';
import { HandRig } from './hand.js';
import { Skateboard } from './skateboard.js';
import { PhysicsWorld } from './physics.js';

async function main() {
  const videoElement = document.getElementById('webcam');
  const loadingElement = document.getElementById('loading');

  // 1. Setup Scene
  const sceneManager = new SceneManager('container');

  // 1.5 Setup Physics
  const physicsWorld = new PhysicsWorld();

  // 2. Setup Hand Rig
  const handRig = new HandRig(sceneManager.scene);
  handRig.initPhysics(physicsWorld);

  // 2.5 Setup Skateboard
  const skateboard = new Skateboard(sceneManager.scene);
  skateboard.initPhysics(physicsWorld);

  // 3. Setup Tracker
  const tracker = new HandTracker(videoElement);

  try {
    await tracker.initialize();
    loadingElement.style.display = 'none';
  } catch (error) {
    console.error("Failed to initialize tracker:", error);
    loadingElement.textContent = "Error initializing tracker: " + error.message;
    return;
  }

  // 4. Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    // Detect hands
    const results = tracker.detect();
    if (results && results.landmarks) {
      handRig.update(results.landmarks);

      // Skateboard update is now physics-driven, no manual position update needed here
      // But we still call update() to sync visual with physics
      skateboard.update();

      // Handle Grab Interaction
      const palmPos = handRig.getPalmPosition();
      if (palmPos && handRig.handGroup.visible) {
        const dist = palmPos.distanceTo(skateboard.mesh.position);
        const GRAB_DISTANCE = 2.0; // Threshold distance to grab

        if (handRig.isGrabbing && dist < GRAB_DISTANCE) {
          // Apply adhesion force instead of kinematic grab
          skateboard.applyAdhesion(palmPos);
        }

        // Check for Tricks
        skateboard.checkTricks(handRig);
      }
    }

    // Update physics
    physicsWorld.update();

    // Render scene
    sceneManager.update();
  }

  animate();
}

main();
