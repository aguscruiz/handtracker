import * as THREE from 'three'
import { World } from './World.js'
import { HandTracker } from './HandTracker.js'
import { Skateboard } from './Skateboard.js'
import { HandVisualizer } from './HandVisualizer.js'

export class Game {
    constructor() {
        this.world = new World()
        this.handTracker = new HandTracker()
        this.skateboard = new Skateboard(this.world)
        this.handVisualizer = new HandVisualizer(this.world)

        this.isRunning = false
        this.lastTime = 0
    }

    async start() {
        await this.handTracker.init()
        const loading = document.getElementById('loading')
        if (loading) loading.style.display = 'none'

        this.isRunning = true
        this.animate(0)
    }

    animate(time) {
        if (!this.isRunning) return
        requestAnimationFrame((t) => this.animate(t))

        const dt = (time - this.lastTime) / 1000
        this.lastTime = time

        // Update physics
        this.world.update(dt)

        // Update game logic
        const handData = this.handTracker.getHandData()
        if (handData) {
            this.skateboard.updateInput(handData)
            this.handVisualizer.update(handData)
        } else {
            this.handVisualizer.update(null)
        }
        this.skateboard.update()

        // Render
        this.world.render()
    }
}
