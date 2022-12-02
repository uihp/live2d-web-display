import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix'

import * as Config from './config'
import Sprite from './sprite'
import TextureManager, { TextureInfo } from './texture'
import Displayer from './displayer'

class TouchManager {
  /**
   * コンストラクタ
   */
  constructor() {
    this._startX = 0.0
    this._startY = 0.0
    this._lastX = 0.0
    this._lastY = 0.0
    this._lastX1 = 0.0
    this._lastY1 = 0.0
    this._lastX2 = 0.0
    this._lastY2 = 0.0
    this._lastTouchDistance = 0.0
    this._deltaX = 0.0
    this._deltaY = 0.0
    this._scale = 1.0
    this._touchSingle = false
    this._flipAvailable = false
  }

  public getCenterX(): number {
    return this._lastX
  }

  public getCenterY(): number {
    return this._lastY
  }

  public getDeltaX(): number {
    return this._deltaX
  }

  public getDeltaY(): number {
    return this._deltaY
  }

  public getStartX(): number {
    return this._startX
  }

  public getStartY(): number {
    return this._startY
  }

  public getScale(): number {
    return this._scale
  }

  public getX(): number {
    return this._lastX
  }

  public getY(): number {
    return this._lastY
  }

  public getX1(): number {
    return this._lastX1
  }

  public getY1(): number {
    return this._lastY1
  }

  public getX2(): number {
    return this._lastX2
  }

  public getY2(): number {
    return this._lastY2
  }

  public isSingleTouch(): boolean {
    return this._touchSingle
  }

  public isFlickAvailable(): boolean {
    return this._flipAvailable
  }

  public disableFlick(): void {
    this._flipAvailable = false
  }

  /**
   * タッチ開始時イベント
   * @param deviceX タッチした画面のxの値
   * @param deviceY タッチした画面のyの値
   */
  public touchesBegan(deviceX: number, deviceY: number): void {
    this._lastX = deviceX
    this._lastY = deviceY
    this._startX = deviceX
    this._startY = deviceY
    this._lastTouchDistance = -1.0
    this._flipAvailable = true
    this._touchSingle = true
  }

  /**
   * ドラッグ時のイベント
   * @param deviceX タッチした画面のxの値
   * @param deviceY タッチした画面のyの値
   */
  public touchesMoved(deviceX: number, deviceY: number): void {
    this._lastX = deviceX
    this._lastY = deviceY
    this._lastTouchDistance = -1.0
    this._touchSingle = true
  }

  /**
   * フリックの距離測定
   * @return フリック距離
   */
  public getFlickDistance(): number {
    return this.calculateDistance(
      this._startX,
      this._startY,
      this._lastX,
      this._lastY
    )
  }

  /**
   * 点１から点２への距離を求める
   *
   * @param x1 １つ目のタッチした画面のxの値
   * @param y1 １つ目のタッチした画面のyの値
   * @param x2 ２つ目のタッチした画面のxの値
   * @param y2 ２つ目のタッチした画面のyの値
   */
  public calculateDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
  }

  /**
   * ２つ目の値から、移動量を求める。
   * 違う方向の場合は移動量０。同じ方向の場合は、絶対値が小さい方の値を参照する。
   *
   * @param v1 １つ目の移動量
   * @param v2 ２つ目の移動量
   *
   * @return 小さい方の移動量
   */
  public calculateMovingAmount(v1: number, v2: number): number {
    if (v1 > 0.0 != v2 > 0.0) {
      return 0.0
    }

    const sign: number = v1 > 0.0 ? 1.0 : -1.0
    const absoluteValue1 = Math.abs(v1)
    const absoluteValue2 = Math.abs(v2)
    return (
      sign * (absoluteValue1 < absoluteValue2 ? absoluteValue1 : absoluteValue2)
    )
  }

  _startY: number; // タッチを開始した時のxの値
  _startX: number; // タッチを開始した時のyの値
  _lastX: number; // シングルタッチ時のxの値
  _lastY: number; // シングルタッチ時のyの値
  _lastX1: number; // ダブルタッチ時の一つ目のxの値
  _lastY1: number; // ダブルタッチ時の一つ目のyの値
  _lastX2: number; // ダブルタッチ時の二つ目のxの値
  _lastY2: number; // ダブルタッチ時の二つ目のyの値
  _lastTouchDistance: number; // 2本以上でタッチしたときの指の距離
  _deltaX: number; // 前回の値から今回の値へのxの移動距離。
  _deltaY: number; // 前回の値から今回の値へのyの移動距離。
  _scale: number; // このフレームで掛け合わせる拡大率。拡大操作中以外は1。
  _touchSingle: boolean; // シングルタッチ時はtrue
  _flipAvailable: boolean; // フリップが有効かどうか
}

class View {
  displayer: Displayer
  touchManager: TouchManager
  deviceToScreen: CubismMatrix44
  viewMatrix: CubismViewMatrix
  programId: WebGLProgram
  back: Sprite
  gear: Sprite
  _changeModel: boolean
  _isClick: boolean

  constructor(displayer: Displayer) {
    this.displayer = displayer
    this.programId = null
    this.back = null
    this.gear = null

    this.touchManager = new TouchManager()
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

  public release(): void {
    this.viewMatrix = null
    this.touchManager = null
    this.deviceToScreen = null

    this.gear.release()
    this.gear = null

    this.back.release()
    this.back = null

    this.displayer.gl.deleteProgram(this.programId)
    this.programId = null
  }

  public render(): void {
    this.displayer.gl.useProgram(this.programId)
    if (this.back) this.back.render()
    if (this.gear) this.gear.render()
    this.displayer.gl.flush()
    const live2DManager = this.displayer.manager
    live2DManager.setViewMatrix(this.viewMatrix)
    live2DManager.onUpdate()
  }

  public initializeSprite(textureManager: TextureManager): void {
    const width: number = this.displayer.canvas.width
    const height: number = this.displayer.canvas.height

    if (this.programId == null) this.programId = this.displayer.createShader()

    const resourcesPath = Config.ResourcesPath
    let imageName = Config.BackImageName
    const initBackGroundTexture = (textureInfo: TextureInfo): void => {
      const x: number = width * 0.5
      const y: number = height * 0.5

      const fwidth = textureInfo.width * 2.0
      const fheight = height * 0.95
      this.back = new Sprite(x, y, fwidth, fheight, textureInfo.id, this.displayer)
      this.back.initialize(this.programId)
    }
    textureManager.createTextureFromPngFile(
      resourcesPath + imageName,
      false,
      initBackGroundTexture
    )

    imageName = Config.GearImageName
    const initGearTexture = (textureInfo: TextureInfo): void => {
      const x = width - textureInfo.width * 0.5
      const y = height - textureInfo.height * 0.5
      const fwidth = textureInfo.width
      const fheight = textureInfo.height
      this.gear = new Sprite(x, y, fwidth, fheight, textureInfo.id, this.displayer)
      this.gear.initialize(this.programId)
    }
    textureManager.createTextureFromPngFile(
      resourcesPath + imageName,
      false,
      initGearTexture
    )
  }

  public onTouchesBegan(pointX: number, pointY: number): void {
    this.touchManager.touchesBegan(pointX, pointY)
  }

  public onTouchesMoved(pointX: number, pointY: number): void {
    const viewX: number = this.transformViewX(this.touchManager.getX())
    const viewY: number = this.transformViewY(this.touchManager.getY())
    this.touchManager.touchesMoved(pointX, pointY)
    const live2DManager = this.displayer.manager
    live2DManager.onDrag(viewX, viewY)
  }

  public onTouchesEnded(pointX: number, pointY: number): void {
    const x: number = this.deviceToScreen.transformX(this.touchManager.getX())
    const y: number = this.deviceToScreen.transformY(this.touchManager.getY())
    const live2DManager = this.displayer.manager
    live2DManager.onDrag(0.0, 0.0)
    if (Config.DebugTouchLogEnable) console.log(`[APP]touchesEnded x: ${x} y: ${y}`)
    live2DManager.onTap(x, y)
    if (this.gear.isHit(pointX, pointY)) live2DManager.nextScene()
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

export default View
