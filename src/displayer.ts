// framework
import { CubismFramework, Option, LogLevel } from '@framework/live2dcubismframework'
import { csmVector, iterator } from '@framework/type/csmvector'
import { Config, TextureInfo, Priority } from './types'
// access ref
import Pointer from './pointer'
import Manager from './manager'

class StructableOption extends Option {
    constructor (
        public logFunction: Live2DCubismCore.csmLogFunction,
        public loggingLevel: LogLevel
    ) { super() }
}

class Displayer {
    settings: Config
    gl: WebGLRenderingContext
    pointer: Pointer
    manager: Manager
    textures: csmVector<TextureInfo>

    constructor(public canvas: HTMLCanvasElement, options: Config) {
        this.settings = Object.assign({
            callbackHandler: (
                type: string, detail: object | string,
                consoleAccess = 'log'
            ) => console[consoleAccess](`[${type}]`, detail),
            priority: Priority.Normal,
            frameworkLogLevel: LogLevel.LogLevel_Verbose,
            viewport: {
                iniRatio: 1.0, maxRatio: 2.0, minRatio: 0.8,
                iniLeft: -1.0, iniRight: 1.0, iniBottom: -1.0, iniTop: 1.0,
                maxLeft: -2.0, maxRight: 2.0, maxBottom: -2.0, maxTop: 2.0
            }
        }, options)
        this.gl = this.canvas.getContext('webgl')
        this.pointer = new Pointer(this)
        this.manager = new Manager(this)
        this.textures = new csmVector<TextureInfo>()
        CubismFramework.startUp(new StructableOption(
            (msg: string) => this.settings.callbackHandler('Framework', msg),
            this.settings.frameworkLogLevel
        ))
    }

    public initialize(): boolean {
        this.canvas.addEventListener('pointerdown', e => this.pointer.onPointerDown(e))
        this.canvas.addEventListener('pointermove', e => this.pointer.onPointerMove(e))
        this.canvas.addEventListener('pointerup', () => this.pointer.onPointerUp())
        if (!this.gl) {
            console.error('Cannot initialize WebGL. This browser does not support.')
            return false
        }
        CubismFramework.initialize()
        this.pointer.initialize()
        this.manager.changeScene()
        return true
    }

    public release(): void {
        CubismFramework.dispose()
        this.pointer = null
        this.manager = null
    }

    public run(): void {
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
                ite.ptr().usePremultiply == usePremultiply
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
