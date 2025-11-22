import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export class HandTracker {
    constructor() {
        this.handLandmarker = null
        this.video = null
        this.lastVideoTime = -1
        this.results = null
    }

    async init() {
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
        )

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 1
        })

        await this.setupCamera()
    }

    async setupCamera() {
        this.video = document.getElementById('webcam')
        if (!this.video) {
            this.video = document.createElement('video')
            this.video.id = 'webcam'
            this.video.style.display = 'none' // Hide by default, maybe show small preview later
            this.video.autoplay = true
            this.video.playsInline = true
            document.body.appendChild(this.video)
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        this.video.srcObject = stream

        return new Promise((resolve) => {
            this.video.onloadeddata = () => {
                this.video.play()
                resolve()
            }
        })
    }

    getHandData() {
        if (!this.handLandmarker || !this.video) return null

        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime
            this.results = this.handLandmarker.detectForVideo(this.video, performance.now())
        }

        if (this.results && this.results.landmarks && this.results.landmarks.length > 0) {
            return this.results.landmarks[0] // Return first detected hand
        }
        return null
    }
}
