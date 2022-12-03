import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix'

import * as Config from './config'
import Displayer from './displayer'

class Pointer {
  displayer: Displayer
  deviceToScreen: CubismMatrix44
  viewMatrix: CubismViewMatrix
  programId: WebGLProgram

  startY: number = 0.0
  startX: number = 0.0
  lastX: number = 0.0
  lastY: number = 0.0
  lastX1: number = 0.0
  lastY1: number = 0.0
  lastX2: number = 0.0
  lastY2: number = 0.0
  lastTouchDistance: number = 0.0
  deltaX: number = 0.0
  deltaY: number = 0.0
  scale: number = 1.0
  touchSingle: boolean = false
  flipAvailable: boolean = false

  _captured: boolean
  _mouseX: number
  _mouseY: number
  _isEnd: boolean

  constructor(displayer: Displayer) {
    this.displayer = displayer
    this.deviceToScreen = new CubismMatrix44()
    this.viewMatrix = new CubismViewMatrix()
  }

  public initialize(): void {
    const { width, height } = this.displayer.canvas
    const ratio: number = width / height
    const left: number = -ratio
    const right: number = ratio
    const bottom: number = Config.ViewLogicalLeft
    const top: number = Config.ViewLogicalRight
    this.viewMatrix.setScreenRect(left, right, bottom, top)
    this.viewMatrix.scale(Config.ViewScale, Config.ViewScale)
    this.deviceToScreen.loadIdentity()
    if (width > height) {
      const screenW: number = Math.abs(right - left)
      this.deviceToScreen.scaleRelative(screenW / width, -screenW / width)
    } else {
      const screenH: number = Math.abs(top - bottom)
      this.deviceToScreen.scaleRelative(screenH / height, -screenH / height)
    }
    this.deviceToScreen.translateRelative(-width * 0.5, -height * 0.5)
    this.viewMatrix.setMaxScale(Config.ViewMaxScale)
    this.viewMatrix.setMinScale(Config.ViewMinScale)
    this.viewMatrix.setMaxScreenRect(
      Config.ViewLogicalMaxLeft,
      Config.ViewLogicalMaxRight,
      Config.ViewLogicalMaxBottom,
      Config.ViewLogicalMaxTop
    )
  }

  public render(): void {
    this.displayer.manager.setViewMatrix(this.viewMatrix)
  }

  public touchesBegan(deviceX: number, deviceY: number): void {
    this.lastX = deviceX
    this.lastY = deviceY
    this.startX = deviceX
    this.startY = deviceY
    this.lastTouchDistance = -1.0
    this.flipAvailable = true
    this.touchSingle = true
  }

  public touchesMoved(deviceX: number, deviceY: number): void {
    this.lastX = deviceX
    this.lastY = deviceY
    this.lastTouchDistance = -1.0
    this.touchSingle = true
  }

  public getFlickDistance(): number {
    return this.calculateDistance(
      this.startX,
      this.startY,
      this.lastX,
      this.lastY
    )
  }

  public calculateDistance(
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
  }

  public calculateMovingAmount(v1: number, v2: number): number {
    if (v1 > 0.0 != v2 > 0.0) return 0.0
    const sign: number = v1 > 0.0 ? 1.0 : -1.0
    const absoluteValue1 = Math.abs(v1)
    const absoluteValue2 = Math.abs(v2)
    return sign * (absoluteValue1 < absoluteValue2 ? absoluteValue1 : absoluteValue2)
  }

  public onClickBegan(e: MouseEvent): void {
    this._captured = true
    this.onTouchesBegan(e.pageX, e.pageY)
  }

  public onMouseMoved(e: MouseEvent): void {
    if (!this._captured) return
    const rect = (e.target as Element).getBoundingClientRect()
    this.onTouchesMoved(
      e.clientX - rect.left,
      e.clientY - rect.top
    )
  }

  public onClickEnded(e: MouseEvent): void {
    this._captured = false
    const rect = (e.target as Element).getBoundingClientRect()
    this.onTouchesEnded(
      e.clientX - rect.left,
      e.clientY - rect.top
    )
  }

  public onTouchBegan(e: TouchEvent): void {
    this._captured = true
    this.onTouchesBegan(
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
    this.onTouchesMoved(posX, posY)
  }

  public onTouchEnded(e: TouchEvent): void {
    this._captured = false
    const rect = (e.target as Element).getBoundingClientRect()
    const posX = e.changedTouches[0].clientX - rect.left
    const posY = e.changedTouches[0].clientY - rect.top
    this.onTouchesEnded(posX, posY)
  }

  public onTouchCancel(e: TouchEvent): void {
    this._captured = false
    const rect = (e.target as Element).getBoundingClientRect()
    const posX = e.changedTouches[0].clientX - rect.left
    const posY = e.changedTouches[0].clientY - rect.top
    this.onTouchesEnded(posX, posY)
  }

  public onTouchesBegan(pointX: number, pointY: number): void {
    this.touchesBegan(pointX, pointY)
  }

  public onTouchesMoved(pointX: number, pointY: number): void {
    const viewX: number = this.transformViewX(this.lastX)
    const viewY: number = this.transformViewY(this.lastY)
    this.touchesMoved(pointX, pointY)
    this.displayer.manager.onDrag(viewX, viewY)
  }

  public onTouchesEnded(pointX: number, pointY: number): void {
    const x: number = this.deviceToScreen.transformX(this.lastX)
    const y: number = this.deviceToScreen.transformY(this.lastY)
    this.displayer.manager.onDrag(0.0, 0.0)
    this.displayer.manager.onTap(x, y)
    if (Config.DebugTouchLogEnable) console.log(`[APP]touchesEnded x: ${x} y: ${y}`)
  }

  public transformViewX(deviceX: number): number {
    const screenX: number = this.deviceToScreen.transformX(deviceX)
    return this.viewMatrix.invertTransformX(screenX)
  }

  public transformViewY(deviceY: number): number {
    const screenY: number = this.deviceToScreen.transformY(deviceY)
    return this.viewMatrix.invertTransformY(screenY)
  }

  public transformScreenX(deviceX: number): number {
    return this.deviceToScreen.transformX(deviceX)
  }

  public transformScreenY(deviceY: number): number {
    return this.deviceToScreen.transformY(deviceY)
  }
}

export default Pointer
