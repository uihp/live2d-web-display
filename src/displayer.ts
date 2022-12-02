import { CubismFramework, Option } from '@framework/live2dcubismframework'
import { LogLevel } from '@framework/live2dcubismframework'

import View from './view'
import Manager from './manager'
import TextureManager from './texture'

interface Options {
    size: { width: number; height: number } | 'auto',
    framework: Option
}

class Displayer {
    gl: WebGLRenderingContext
    frameBuffer: WebGLFramebuffer
    view: View
    manager: Manager
    textureManager: TextureManager
    deltaTime = 0.0
    lastFrame = 0.0

    constructor(public canvas: HTMLCanvasElement, public options: Options) {
        this.gl = this.canvas.getContext('webgl')
        this.frameBuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING)
        this.view = new View(this)
        this.textureManager = new TextureManager(this.gl)
    }

    public initialize(): boolean {
        if (this.options.size === 'auto') {
            this.canvas.width = window.innerWidth
            this.canvas.height = window.innerHeight
        } else {
            this.canvas.width = this.options.size.width
            this.canvas.height = this.options.size.height
        }
        if ('ontouchend' in this.canvas) {
            this.canvas.ontouchstart = (e) => this.onTouchBegan(e)
            this.canvas.ontouchmove = (e) => this.onTouchMoved(e)
            this.canvas.ontouchend = (e) => this.onTouchEnded(e)
            this.canvas.ontouchcancel = (e) => this.onTouchCancel(e)
        } else {
            this.canvas.onmousedown = e => this.onClickBegan(e)
            this.canvas.onmousemove = e => this.onMouseMoved(e)
            this.canvas.onmouseup = e => this.onClickEnded(e)
        }
        if (!this.gl) {
            console.error('Cannot initialize WebGL. This browser does not support.')
            return false
        }
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
        this.view.initialize()
        this.view.initializeSprite(this.textureManager)
        let options = this.options.framework
        if (!options) {
            options = new Option()
            options.logFunction = (msg: string) => console.log(msg)
            options.loggingLevel = LogLevel.LogLevel_Verbose
        }
        CubismFramework.startUp(options)
        CubismFramework.initialize()
        this.manager = new Manager(this)
        this.updateTime()
        return true
    }

    public release(): void {
        this.textureManager.release()
        this.textureManager = null
        this.view.release()
        this.view = null
        this.manager = null
        CubismFramework.dispose()
    }

    public run(): void {
        this.updateTime()
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
        this.gl.enable(this.gl.DEPTH_TEST)
        this.gl.depthFunc(this.gl.LEQUAL)
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
        this.gl.clearDepth(1.0)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
        this.view.render()
        requestAnimationFrame(() => this.run())
    }

    public updateTime(): void {
        let currentTime = Date.now()
        this.deltaTime = (currentTime - this.lastFrame) / 1000
        this.lastFrame = currentTime
    }

    public createShader(): WebGLProgram {
        const vertexShaderId = this.gl.createShader(this.gl.VERTEX_SHADER)
        if (vertexShaderId == null) {
            console.error('failed to create vertexShader')
            return null
        }

        const vertexShader: string =
            'precision mediump float;' +
            'attribute vec3 position;' +
            'attribute vec2 uv;' +
            'varying vec2 vuv;' +
            'void main(void)' +
            '{' +
            '   gl_Position = vec4(position, 1.0);' +
            '   vuv = uv;' +
            '}'

        this.gl.shaderSource(vertexShaderId, vertexShader)
        this.gl.compileShader(vertexShaderId)

        // フラグメントシェーダのコンパイル
        const fragmentShaderId = this.gl.createShader(this.gl.FRAGMENT_SHADER)

        if (fragmentShaderId == null) {
            console.error('failed to create fragmentShader')
            return null
        }

        const fragmentShader: string =
            'precision mediump float;' +
            'varying vec2 vuv;' +
            'uniform sampler2D texture;' +
            'void main(void)' +
            '{' +
            '   gl_FragColor = texture2D(texture, vuv);' +
            '}'

        this.gl.shaderSource(fragmentShaderId, fragmentShader)
        this.gl.compileShader(fragmentShaderId)

        // プログラムオブジェクトの作成
        const programId = this.gl.createProgram()
        this.gl.attachShader(programId, vertexShaderId)
        this.gl.attachShader(programId, fragmentShaderId)

        this.gl.deleteShader(vertexShaderId)
        this.gl.deleteShader(fragmentShaderId)
        this.gl.linkProgram(programId)
        this.gl.useProgram(programId)
        return programId
    }

    _captured: boolean
    _mouseX: number
    _mouseY: number
    _isEnd: boolean

    public onClickBegan(e: MouseEvent): void {
        this._captured = true
        this.view.onTouchesBegan(e.pageX, e.pageY)
    }

    public onMouseMoved(e: MouseEvent): void {
        if (!this._captured) return
        const rect = (e.target as Element).getBoundingClientRect()
        this.view.onTouchesMoved(
            e.clientX - rect.left,
            e.clientY - rect.top
        )
    }

    public onClickEnded(e: MouseEvent): void {
        this._captured = false
        const rect = (e.target as Element).getBoundingClientRect()
        this.view.onTouchesEnded(
            e.clientX - rect.left,
            e.clientY - rect.top
        )
    }

    public onTouchBegan(e: TouchEvent): void {
        this._captured = true
        this.view.onTouchesBegan(
            e.changedTouches[0].pageX,
            e.changedTouches[0].pageX
        )
    }

    public onTouchMoved(e: TouchEvent): void {
        e.preventDefault()
        if (!this._captured) return
        const rect = (e.target as Element).getBoundingClientRect()
        const posX = e.changedTouches[0].clientX - rect.left
        const posY = e.changedTouches[0].clientY - rect.top
        this.view.onTouchesMoved(posX, posY)
    }

    public onTouchEnded(e: TouchEvent): void {
        this._captured = false
        const rect = (e.target as Element).getBoundingClientRect()
        const posX = e.changedTouches[0].clientX - rect.left
        const posY = e.changedTouches[0].clientY - rect.top
        this.view.onTouchesEnded(posX, posY)
    }

    public onTouchCancel(e: TouchEvent): void {
        this._captured = false
        const rect = (e.target as Element).getBoundingClientRect()
        const posX = e.changedTouches[0].clientX - rect.left
        const posY = e.changedTouches[0].clientY - rect.top
        this.view.onTouchesEnded(posX, posY)
    }
}

export default Displayer
