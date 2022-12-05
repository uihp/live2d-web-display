// framework
import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { ACubismMotion } from '@framework/motion/acubismmotion'
import { csmVector } from '@framework/type/csmvector'
// access ref
import Model from './model'
// type ref
import Displayer from './displayer'

class Manager {
  displayer: Displayer
  viewMatrix: CubismMatrix44
  models: csmVector<Model>
  sceneIndex: number
  deltaTime = 0.0
  lastFrame = 0.0

  constructor(displayer: Displayer) {
    this.displayer = displayer
    this.viewMatrix = new CubismMatrix44()
    this.models = new csmVector<Model>()
    this.sceneIndex = 0
  }

  public getModel(no: number): Model {
    if (no < this.models.getSize()) return this.models.at(no)
    return null
  }

  public releaseAllModel(): void {
    for (let i = 0; i < this.models.getSize(); i++) {
      this.models.at(i).release()
      this.models.set(i, null)
    }
    this.models.clear()
  }

  public onDrag(x: number, y: number): void {
    for (let i = 0; i < this.models.getSize(); i++) {
      const model: Model = this.getModel(i)
      if (model) model.setDragging(x, y)
    }
  }

  public onTap(x: number, y: number): void {
    this.displayer.settings.callbackHandler('Interacted', `Pointer at: {x: ${x.toFixed(2)}, y: ${y.toFixed(2)}}`)
    for (let i = 0; i < this.models.getSize(); i++) {
      let areaname = this.models.at(i).onHit(x, y)
      this.displayer.settings.callbackHandler('Interacted', `Hit Area: "${areaname}"`)
      let modelConfig = this.displayer.settings.modelConfigs[this.sceneIndex]
      if (areaname == modelConfig.expression) this.models.at(i).setRandomExpression()
      this.models.at(i).startRandomMotion(
        modelConfig.interaction[areaname],
        this.displayer.settings.priority,
        (e: ACubismMotion): void => this.displayer.settings.callbackHandler('Event', e)
      )
    }
  }

  public updateTime(): void {
    let currentTime = Date.now()
    this.deltaTime = (currentTime - this.lastFrame) / 1000
    this.lastFrame = currentTime
  }

  public onUpdate(): void {
    this.updateTime()
    const { width, height } = this.displayer.canvas
    const modelCount: number = this.models.getSize()
    for (let i = 0; i < modelCount; ++i) {
      const projection: CubismMatrix44 = new CubismMatrix44()
      const model: Model = this.getModel(i)
      if (model.getModel()) {
        if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
          model.getModelMatrix().setWidth(2.0)
          projection.scale(1.0, width / height)
        } else {
          projection.scale(height / width, 1.0)
        }
        if (this.viewMatrix != null) {
          projection.multiplyByMatrix(this.viewMatrix)
        }
      }
      model.update()
      model.draw(projection)
    }
  }

  public nextScene(): void {
    const no: number = (this.sceneIndex + 1) % this.displayer.settings.modelConfigs.length
    this.changeScene(no)
  }

  public changeScene(index: number = this.sceneIndex): void {
    this.sceneIndex = index
    this.displayer.settings.callbackHandler('Interacted', `Model index: ${this.sceneIndex}`)
    const modelConfig = this.displayer.settings.modelConfigs[index]
    this.releaseAllModel()
    this.models.pushBack(new Model(this.displayer))
    this.models.at(0).loadAssets(modelConfig.dirPath, modelConfig.fileName)
  }

  public setViewMatrix(m: CubismMatrix44) {
    for (let i = 0; i < 16; i++)
      this.viewMatrix.getArray()[i] = m.getArray()[i]
  }
}

export default Manager
