import { CubismFramework, Option } from '@framework/live2dcubismframework'
import { LogLevel } from '@framework/live2dcubismframework'
import { csmVector, iterator } from '@framework/type/csmvector'

import Pointer from './pointer'
import Manager from './manager'

interface Options {
    size: { width: number; height: number } | 'auto',
    framework: Option
}

export class TextureInfo {
    constructor(
        public img: HTMLImageElement,
        public id: WebGLTexture = null,
        public width = 0,
        public height = 0,
        public usePremultply: boolean,
        public fileName: string
    ) { }
}

class Displayer {
    gl: WebGLRenderingContext
    pointer: Pointer
    manager: Manager
    textures: csmVector<TextureInfo>
    deltaTime = 0.0
    lastFrame = 0.0

    constructor(public canvas: HTMLCanvasElement, public options: Options) {
        this.gl = this.canvas.getContext('webgl')
        this.pointer = new Pointer(this)
        this.textures = new csmVector<TextureInfo>()
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
            this.canvas.ontouchstart = e => this.pointer.onTouchBegan(e)
            this.canvas.ontouchmove = e => this.pointer.onTouchMoved(e)
            this.canvas.ontouchend = e => this.pointer.onTouchEnded(e)
            this.canvas.ontouchcancel = e => this.pointer.onTouchCancel(e)
        } else {
            this.canvas.onmousedown = e => this.pointer.onClickBegan(e)
            this.canvas.onmousemove = e => this.pointer.onMouseMoved(e)
            this.canvas.onmouseup = e => this.pointer.onClickEnded(e)
        }
        if (!this.gl) {
            console.error('Cannot initialize WebGL. This browser does not support.')
            return false
        }
        this.pointer.initialize()
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
        this.pointer = null
        this.manager = null
        CubismFramework.dispose()
    }

    public run(): void {
        this.updateTime()
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
        this.gl.enable(this.gl.DEPTH_TEST)
        this.gl.depthFunc(this.gl.LEQUAL)
        // this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
        this.gl.clearDepth(1.0)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
        this.gl.flush()
        this.pointer.render()
        this.manager.onUpdate()
        requestAnimationFrame(() => this.run())
    }

    public updateTime(): void {
        let currentTime = Date.now()
        this.deltaTime = (currentTime - this.lastFrame) / 1000
        this.lastFrame = currentTime
    }

    public createTextureFromPngFile(
        fileName: string,
        usePremultiply: boolean,
        callback: (textureInfo: TextureInfo) => void
    ): void {
        for (
            let ite: iterator<TextureInfo> = this.textures.begin();
            ite.notEqual(this.textures.end());
            ite.preIncrement()
        ) {
            if (
                ite.ptr().fileName == fileName &&
                ite.ptr().usePremultply == usePremultiply
            ) {
                ite.ptr().img = new Image()
                ite.ptr().img.onload = (): void => callback(ite.ptr())
                ite.ptr().img.src = fileName
                return
            }
        }
        const img = new Image()
        img.onload = (): void => {
            const tex: WebGLTexture = this.gl.createTexture()
            this.gl.bindTexture(this.gl.TEXTURE_2D, tex)
            this.gl.texParameteri(
                this.gl.TEXTURE_2D,
                this.gl.TEXTURE_MIN_FILTER,
                this.gl.LINEAR_MIPMAP_LINEAR
            )
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
            if (usePremultiply) this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img)
            this.gl.generateMipmap(this.gl.TEXTURE_2D)
            this.gl.bindTexture(this.gl.TEXTURE_2D, null)
            const textureInfo: TextureInfo = new TextureInfo(
                img, tex, img.width, img.height,
                usePremultiply, fileName
            )
            this.textures.pushBack(textureInfo)
            callback(textureInfo)
        }
        img.src = fileName
    }
}

export default Displayer
