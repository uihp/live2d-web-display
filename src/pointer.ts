// framework
import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix'
// type ref
import Displayer from './displayer'

class Pointer {
  displayer: Displayer
  deviceToScreen: CubismMatrix44
  viewMatrix: CubismViewMatrix
  programId: WebGLProgram

  lastX: number = 0.0
  lastY: number = 0.0
  holding: boolean

  constructor(displayer: Displayer) {
    this.displayer = displayer
    this.deviceToScreen = new CubismMatrix44()
    this.viewMatrix = new CubismViewMatrix()
  }

  public initialize(): void {
    const { width, height } = this.displayer.canvas
    const { viewport } = this.displayer.settings
    const ratio: number = width / height
    const left: number = -ratio
    const right: number = ratio
    const bottom: number = viewport.iniLeft
    const top: number = viewport.iniRight
    this.viewMatrix.setScreenRect(left, right, bottom, top)
    this.viewMatrix.scale(viewport.iniRatio, viewport.iniRatio)
    this.deviceToScreen.loadIdentity()
    if (width > height) {
      const screenW: number = Math.abs(right - left)
      this.deviceToScreen.scaleRelative(screenW / width, -screenW / width)
    } else {
      const screenH: number = Math.abs(top - bottom)
      this.deviceToScreen.scaleRelative(screenH / height, -screenH / height)
    }
    this.deviceToScreen.translateRelative(-width * 0.5, -height * 0.5)
    this.viewMatrix.setMaxScale(viewport.maxRatio)
    this.viewMatrix.setMinScale(viewport.minRatio)
    this.viewMatrix.setMaxScreenRect(
      viewport.maxLeft, viewport.maxRight,
      viewport.maxBottom, viewport.maxTop
    )
  }

  public render(): void {
    this.displayer.manager.setViewMatrix(this.viewMatrix)
  }

  public onPointerDown(e: PointerEvent): void {
    this.holding = true
    this.lastX = e.pageX
    this.lastY = e.pageY
  }

  public onPointerMove(e: PointerEvent): void {
    e.preventDefault()
    if (!this.holding) return
    const screenX: number = this.deviceToScreen.transformX(this.lastX)
    const viewX: number = this.viewMatrix.invertTransformX(screenX)
    const screenY: number = this.deviceToScreen.transformY(this.lastY)
    const viewY: number = this.viewMatrix.invertTransformY(screenY)
    this.displayer.manager.onDrag(viewX, viewY)
    this.lastX = e.pageX
    this.lastY = e.pageY
  }

  public onPointerUp(): void {
    this.holding = false
    this.displayer.manager.onDrag(0.0, 0.0)
    this.displayer.manager.onTap(
      this.deviceToScreen.transformX(this.lastX),
      this.deviceToScreen.transformY(this.lastY)
    )
  }
}

export default Pointer
