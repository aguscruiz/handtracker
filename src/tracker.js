import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class HandTracker {
  constructor(videoElement) {
    this.video = videoElement;
    this.handLandmarker = null;
    this.runningMode = "VIDEO";
    this.lastVideoTime = -1;
    this.results = null;
  }

  async initialize() {
    console.log("Initializing FilesetResolver...");
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    console.log("Creating HandLandmarker...");
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: this.runningMode,
      numHands: 1
    });

    console.log("Starting Webcam...");
    await this.startWebcam();
    console.log("Webcam started.");
  }

  async startWebcam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Browser API navigator.mediaDevices.getUserMedia not available");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 1280,
        height: 720
      }
    });

    this.video.srcObject = stream;

    return new Promise((resolve) => {
      this.video.addEventListener("loadeddata", () => {
        console.log("Video data loaded");
        resolve();
      });
    });
  }

  detect() {
    if (!this.handLandmarker) return null;

    let startTimeMs = performance.now();
    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      this.results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
    }

    return this.results;
  }
}

