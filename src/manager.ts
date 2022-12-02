// framework
import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { ACubismMotion } from '@framework/motion/acubismmotion'
import { csmVector } from '@framework/type/csmvector'
// access ref
import Model from './model'
import * as Config from './config'
// type ref
import Displayer from './displayer' 

class Manager {
  displayer: Displayer
  viewMatrix: CubismMatrix44
  models: csmVector<Model>
  sceneIndex: number

  constructor(displayer: Displayer) {
    this.displayer = displayer
    this.viewMatrix = new CubismMatrix44()
    this.models = new csmVector<Model>()
    this.sceneIndex = 0
    this.changeScene(this.sceneIndex)
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
    if (Config.DebugLogEnable) {
      console.log(`[APP]tap point: {x: ${x.toFixed(2)} y: ${y.toFixed(2)}}`)
    }
    for (let i = 0; i < this.models.getSize(); i++) {
      if (this.models.at(i).hitTest(Config.HitAreaNameHead, x, y)) {
        if (Config.DebugLogEnable) {
          console.log(
            `[APP]hit area: [${Config.HitAreaNameHead}]`
          )
        }
        this.models.at(i).setRandomExpression()
      } else if (this.models.at(i).hitTest(Config.HitAreaNameBody, x, y)) {
        if (Config.DebugLogEnable) {
          console.log(
            `[APP]hit area: [${Config.HitAreaNameBody}]`
          )
        }
        this.models
          .at(i)
          .startRandomMotion(
            Config.MotionGroupTapBody,
            Config.PriorityNormal,
            (self: ACubismMotion): void => {
              console.log('Motion Finished:')
              console.log(self)
            }
          )
      }
    }
  }

  public onUpdate(): void {
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
      model.draw(projection); 
    }
  }

  public nextScene(): void {
    const no: number = (this.sceneIndex + 1) % Config.ModelDirSize
    this.changeScene(no)
  }

  public changeScene(index: number): void {
    this.sceneIndex = index
    if (Config.DebugLogEnable) {
      console.log(`[APP]model index: ${this.sceneIndex}`)
    }
    const model: string = Config.ModelDir[index]
    const modelPath: string = Config.ResourcesPath + model + '/'
    let modelJsonName: string = Config.ModelDir[index]
    modelJsonName += '.model3.json'
    this.releaseAllModel()
    this.models.pushBack(new Model(this.displayer))
    this.models.at(0).loadAssets(modelPath, modelJsonName)
  }

  public setViewMatrix(m: CubismMatrix44) {
    for (let i = 0; i < 16; i++) {
      this.viewMatrix.getArray()[i] = m.getArray()[i]
    }
  }
}

export default Manager
