import { SceneManager } from './scene.js';
import { HandTracker } from './tracker.js';
import { HandRig } from './hand.js';

async function main() {
  const videoElement = document.getElementById('webcam');
  const loadingElement = document.getElementById('loading');
  
  // 1. Setup Scene
  const sceneManager = new SceneManager('container');
  
  // 2. Setup Hand Rig
  const handRig = new HandRig(sceneManager.scene);
  
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
    }
    
    // Render scene
    sceneManager.update();
  }
  
  animate();
}

main();
