import { LogLevel } from '@framework/live2dcubismframework'

export interface ModelConfig {
    dirPath: string
    fileName: string
    idle: string
    expression: string
    interaction: {
        [key: string]: string
    }
}

export interface CallbackHandler {
    (type: string, detail: object | string, consoleAccess?: string): void
}

export interface View {
    iniRatio: number, maxRatio: number, minRatio: number
    iniLeft: number, iniRight: number, iniBottom: number, iniTop: number
    maxLeft: number, maxRight: number, maxBottom: number, maxTop: number
}

export enum Priority {
    None = 0,
    Idle,
    Normal,
    Force
}

export class Config {
    modelConfigs: Array<ModelConfig>
    callbackHandler?: CallbackHandler
    priority?: Priority
    frameworkLogLevel?: LogLevel
    viewport?: View
}

export class TextureInfo {
    constructor(
        public img: HTMLImageElement,
        public id: WebGLTexture = null,
        public width = 0,
        public height = 0,
        public usePremultiply: boolean,
        public fileName: string
    ) { }
}
