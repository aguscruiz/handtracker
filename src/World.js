import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export class World {
    constructor() {
        this.initThree()
        this.initPhysics()
        this.createEnvironment()
        this.handleResize()
    }

    initThree() {
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x87ceeb) // Sky blue

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
        this.camera.position.set(0, 2, 5)
        this.camera.lookAt(0, 0, 0)

        this.renderer = new THREE.WebGLRenderer({ antialias: true })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.shadowMap.enabled = true
        document.body.appendChild(this.renderer.domElement)

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        this.scene.add(ambientLight)

        const dirLight = new THREE.DirectionalLight(0xffffff, 1)
        dirLight.position.set(5, 10, 5)
        dirLight.castShadow = true
        this.scene.add(dirLight)
    }

    initPhysics() {
        this.physicsWorld = new CANNON.World()
        this.physicsWorld.gravity.set(0, -9.82, 0)
    }

    createEnvironment() {
        // Floor (Visual)
        const floorGeo = new THREE.PlaneGeometry(20, 20)
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
        this.floorMesh = new THREE.Mesh(floorGeo, floorMat)
        this.floorMesh.rotation.x = -Math.PI / 2
        this.floorMesh.receiveShadow = true
        this.scene.add(this.floorMesh)

        // Floor (Physics)
        const floorBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane()
        })
        floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
        this.physicsWorld.addBody(floorBody)
    }

    update(dt) {
        this.physicsWorld.step(1 / 60, dt, 3)
    }

    render() {
        this.renderer.render(this.scene, this.camera)
    }

    handleResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight
            this.camera.updateProjectionMatrix()
            this.renderer.setSize(window.innerWidth, window.innerHeight)
        })
    }
}
