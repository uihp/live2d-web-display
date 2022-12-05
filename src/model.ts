import { CubismDefaultParameterId } from '@framework/cubismdefaultparameterid'
import { CubismModelSettingJson } from '@framework/cubismmodelsettingjson'
import {
  BreathParameterData,
  CubismBreath
} from '@framework/effect/cubismbreath'
import { CubismEyeBlink } from '@framework/effect/cubismeyeblink'
import { ICubismModelSetting } from '@framework/icubismmodelsetting'
import { CubismIdHandle } from '@framework/id/cubismid'
import { CubismFramework } from '@framework/live2dcubismframework'
import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { CubismUserModel } from '@framework/model/cubismusermodel'
import {
  ACubismMotion,
  FinishedMotionCallback
} from '@framework/motion/acubismmotion'
import { CubismMotion } from '@framework/motion/cubismmotion'
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue
} from '@framework/motion/cubismmotionqueuemanager'
import { csmMap } from '@framework/type/csmmap'
import { csmRect } from '@framework/type/csmrectf'
import { csmString } from '@framework/type/csmstring'
import { csmVector } from '@framework/type/csmvector'
import { CubismLogError, CubismLogInfo } from '@framework/utils/cubismdebug'

import Displayer from './displayer'
import { Priority, TextureInfo } from './types'
import WavFileHandler from './wav'

enum LoadStep {
  LoadAssets,
  LoadModel,
  WaitLoadModel,
  LoadExpression,
  WaitLoadExpression,
  LoadPhysics,
  WaitLoadPhysics,
  LoadPose,
  WaitLoadPose,
  SetupEyeBlink,
  SetupBreath,
  LoadUserData,
  WaitLoadUserData,
  SetupEyeBlinkIds,
  SetupLipSyncIds,
  SetupLayout,
  LoadMotion,
  WaitLoadMotion,
  CompleteInitialize,
  CompleteSetupModel,
  LoadTexture,
  WaitLoadTexture,
  CompleteSetup
}

class Model extends CubismUserModel {
  displayer: Displayer
  _modelSetting: ICubismModelSetting;
  _modelHomeDir: string;
  _userTimeSeconds: number;
  _eyeBlinkIds: csmVector<CubismIdHandle>;
  _lipSyncIds: csmVector<CubismIdHandle>;
  _motions: csmMap<string, ACubismMotion>;
  _expressions: csmMap<string, ACubismMotion>;
  _hitArea: csmVector<csmRect>
  _userArea: csmVector<csmRect>
  _idParamAngleX: CubismIdHandle;
  _idParamAngleY: CubismIdHandle;
  _idParamAngleZ: CubismIdHandle;
  _idParamEyeBallX: CubismIdHandle;
  _idParamEyeBallY: CubismIdHandle;
  _idParamBodyAngleX: CubismIdHandle;
  _state: number;
  _expressionCount: number;
  _textureCount: number;
  _motionCount: number;
  _allMotionCount: number;
  _wavFileHandler: WavFileHandler;

  public constructor(displayer: Displayer) {
    super()
    this.displayer = displayer
    this._modelSetting = null
    this._modelHomeDir = null
    this._userTimeSeconds = 0.0
    this._eyeBlinkIds = new csmVector<CubismIdHandle>()
    this._lipSyncIds = new csmVector<CubismIdHandle>()
    this._motions = new csmMap<string, ACubismMotion>()
    this._expressions = new csmMap<string, ACubismMotion>()
    this._hitArea = new csmVector<csmRect>()
    this._userArea = new csmVector<csmRect>()
    this._idParamAngleX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleX
    )
    this._idParamAngleY = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleY
    )
    this._idParamAngleZ = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleZ
    )
    this._idParamEyeBallX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamEyeBallX
    )
    this._idParamEyeBallY = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamEyeBallY
    )
    this._idParamBodyAngleX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamBodyAngleX
    )
    this._state = LoadStep.LoadAssets
    this._expressionCount = 0
    this._textureCount = 0
    this._motionCount = 0
    this._allMotionCount = 0
    this._wavFileHandler = new WavFileHandler()
  }

  public loadAssets(dir: string, fileName: string): void {
    this._modelHomeDir = dir
    fetch(`${this._modelHomeDir}${fileName}`)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const setting: ICubismModelSetting = new CubismModelSettingJson(
          arrayBuffer,
          arrayBuffer.byteLength
        )

        this._state = LoadStep.LoadModel

        this.setupModel(setting)
      })
  }

  private setupModel(setting: ICubismModelSetting): void {
    this._updating = true
    this._initialized = false
    this._modelSetting = setting

    if (this._modelSetting.getModelFileName() != '') {
      const modelFileName = this._modelSetting.getModelFileName()
      fetch(`${this._modelHomeDir}${modelFileName}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          this.loadModel(arrayBuffer)
          this._state = LoadStep.LoadExpression

          loadCubismExpression()
        })
      this._state = LoadStep.WaitLoadModel
    } else {
      console.error('Model data does not exist.')
    }

    const loadCubismExpression = (): void => {
      if (this._modelSetting.getExpressionCount() > 0) {
        const count: number = this._modelSetting.getExpressionCount()
        for (let i = 0; i < count; i++) {
          const expressionName = this._modelSetting.getExpressionName(i)
          const expressionFileName =
            this._modelSetting.getExpressionFileName(i)
          fetch(`${this._modelHomeDir}${expressionFileName}`)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
              const motion: ACubismMotion = this.loadExpression(
                arrayBuffer,
                arrayBuffer.byteLength,
                expressionName
              )
              if (this._expressions.getValue(expressionName) != null) {
                ACubismMotion.delete(
                  this._expressions.getValue(expressionName)
                )
                this._expressions.setValue(expressionName, null)
              }
              this._expressions.setValue(expressionName, motion)
              this._expressionCount++
              if (this._expressionCount >= count) {
                this._state = LoadStep.LoadPhysics

                loadCubismPhysics()
              }
            })
        }
        this._state = LoadStep.WaitLoadExpression
      } else {
        this._state = LoadStep.LoadPhysics

        loadCubismPhysics()
      }
    }

    const loadCubismPhysics = (): void => {
      if (this._modelSetting.getPhysicsFileName() != '') {
        const physicsFileName = this._modelSetting.getPhysicsFileName()
        fetch(`${this._modelHomeDir}${physicsFileName}`)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadPhysics(arrayBuffer, arrayBuffer.byteLength)
            this._state = LoadStep.LoadPose

            loadCubismPose()
          })
        this._state = LoadStep.WaitLoadPhysics
      } else {
        this._state = LoadStep.LoadPose

        loadCubismPose()
      }
    }

    const loadCubismPose = (): void => {
      if (this._modelSetting.getPoseFileName() != '') {
        const poseFileName = this._modelSetting.getPoseFileName()
        fetch(`${this._modelHomeDir}${poseFileName}`)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadPose(arrayBuffer, arrayBuffer.byteLength)
            this._state = LoadStep.SetupEyeBlink

            setupEyeBlink()
          })
        this._state = LoadStep.WaitLoadPose
      } else {
        this._state = LoadStep.SetupEyeBlink

        setupEyeBlink()
      }
    }

    const setupEyeBlink = (): void => {
      if (this._modelSetting.getEyeBlinkParameterCount() > 0) {
        this._eyeBlink = CubismEyeBlink.create(this._modelSetting)
        this._state = LoadStep.SetupBreath
      }

      setupBreath()
    }

    const setupBreath = (): void => {
      this._breath = CubismBreath.create()
      const breathParameters: csmVector<BreathParameterData> = new csmVector()
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5)
      )
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5)
      )
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5)
      )
      breathParameters.pushBack(
        new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5)
      )
      breathParameters.pushBack(
        new BreathParameterData(
          CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamBreath
          ),
          0.5,
          0.5,
          3.2345,
          1
        )
      )
      this._breath.setParameters(breathParameters)
      this._state = LoadStep.LoadUserData

      loadUserData()
    }

    const loadUserData = (): void => {
      if (this._modelSetting.getUserDataFile() != '') {
        const userDataFile = this._modelSetting.getUserDataFile()
        fetch(`${this._modelHomeDir}${userDataFile}`)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadUserData(arrayBuffer, arrayBuffer.byteLength)
            this._state = LoadStep.SetupEyeBlinkIds

            setupEyeBlinkIds()
          })
        this._state = LoadStep.WaitLoadUserData
      } else {
        this._state = LoadStep.SetupEyeBlinkIds

        setupEyeBlinkIds()
      }
    }

    const setupEyeBlinkIds = (): void => {
      const eyeBlinkIdCount: number =
        this._modelSetting.getEyeBlinkParameterCount()
      for (let i = 0; i < eyeBlinkIdCount; ++i) {
        this._eyeBlinkIds.pushBack(
          this._modelSetting.getEyeBlinkParameterId(i)
        )
      }
      this._state = LoadStep.SetupLipSyncIds

      setupLipSyncIds()
    }

    const setupLipSyncIds = (): void => {
      const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount()
      for (let i = 0; i < lipSyncIdCount; ++i) {
        this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(i))
      }
      this._state = LoadStep.SetupLayout

      setupLayout()
    }

    const setupLayout = (): void => {
      const layout: csmMap<string, number> = new csmMap<string, number>()
      if (this._modelSetting == null || this._modelMatrix == null) {
        CubismLogError('Failed to setupLayout().')
        return
      }
      this._modelSetting.getLayoutMap(layout)
      this._modelMatrix.setupFromLayout(layout)
      this._state = LoadStep.LoadMotion

      loadCubismMotion()
    }

    const loadCubismMotion = (): void => {
      this._state = LoadStep.WaitLoadMotion
      this._model.saveParameters()
      this._allMotionCount = 0
      this._motionCount = 0
      const group: string[] = []
      const motionGroupCount: number = this._modelSetting.getMotionGroupCount()

      for (let i = 0; i < motionGroupCount; i++) {
        group[i] = this._modelSetting.getMotionGroupName(i)
        this._allMotionCount += this._modelSetting.getMotionCount(group[i])
      }

      for (let i = 0; i < motionGroupCount; i++) {
        this.preLoadMotionGroup(group[i])
      }

      if (motionGroupCount == 0) {
        this._state = LoadStep.LoadTexture

        this._motionManager.stopAllMotions()
        this._updating = false
        this._initialized = true
        this.createRenderer()
        this.getRenderer().startUp(this.displayer.gl)
      }
    }
  }

  private setupTextures(): void {
    const usePremultiply = true
    if (this._state == LoadStep.LoadTexture) {
      const textureCount: number = this._modelSetting.getTextureCount()
      for (
        let modelTextureNumber = 0;
        modelTextureNumber < textureCount;
        modelTextureNumber++
      ) {
        if (this._modelSetting.getTextureFileName(modelTextureNumber) == '') {
          console.log('getTextureFileName null')
          continue
        }

        let texturePath =
          this._modelSetting.getTextureFileName(modelTextureNumber)
        texturePath = this._modelHomeDir + texturePath

        const onLoad = (textureInfo: TextureInfo): void => {
          this.getRenderer().bindTexture(modelTextureNumber, textureInfo.id)
          this._textureCount++
          if (this._textureCount >= textureCount) {
            this._state = LoadStep.CompleteSetup
          }
        }

        this.displayer.createTextureFromPngFile(texturePath, usePremultiply, onLoad)
        this.getRenderer().setIsPremultipliedAlpha(usePremultiply)
      }
      this._state = LoadStep.WaitLoadTexture
    }
  }

  public reloadRenderer(): void {
    this.deleteRenderer()
    this.createRenderer()
    this.setupTextures()
  }

  public update(): void {
    if (this._state != LoadStep.CompleteSetup) return
    const deltaTimeSeconds: number = this.displayer.manager.deltaTime
    this._userTimeSeconds += deltaTimeSeconds
    this._dragManager.update(deltaTimeSeconds)
    this._dragX = this._dragManager.getX()
    this._dragY = this._dragManager.getY()

    let motionUpdated = false

    this._model.loadParameters();
    if (this._motionManager.isFinished()) {
      this.startRandomMotion(
        this.displayer.settings.modelConfigs[this.displayer.manager.sceneIndex].idle,
        Priority.Idle
      )
    } else {
      motionUpdated = this._motionManager.updateMotion(
        this._model,
        deltaTimeSeconds
      );
    }
    this._model.saveParameters();

    if (!motionUpdated) {
      if (this._eyeBlink != null) {
        this._eyeBlink.updateParameters(this._model, deltaTimeSeconds);
      }
    }
    if (this._expressionManager != null) {
      this._expressionManager.updateMotion(this._model, deltaTimeSeconds);
    }

    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30);
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30)
    this._model.addParameterValueById(
      this._idParamAngleZ,
      this._dragX * this._dragY * -30
    )

    this._model.addParameterValueById(
      this._idParamBodyAngleX,
      this._dragX * 10
    );

    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX);
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY)

    if (this._breath != null) {
      this._breath.updateParameters(this._model, deltaTimeSeconds)
    }

    if (this._physics != null) {
      this._physics.evaluate(this._model, deltaTimeSeconds)
    }

    if (this._lipsync) {
      let value = 0.0;
      this._wavFileHandler.update(deltaTimeSeconds)
      value = this._wavFileHandler.getRms()
      for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
        this._model.addParameterValueById(this._lipSyncIds.at(i), value, 0.8)
      }
    }

    if (this._pose != null) {
      this._pose.updateParameters(this._model, deltaTimeSeconds)
    }
    this._model.update()
  }

  public startMotion(
    group: string,
    no: number,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (priority == Priority.Force) {
      this._motionManager.setReservePriority(priority)
    } else if (!this._motionManager.reserveMotion(priority)) {
      if (this._debugMode) console.error("[APP]can't start motion.")
      return InvalidMotionQueueEntryHandleValue
    }
    const motionFileName = this._modelSetting.getMotionFileName(group, no)
    const name = `${group}_${no}`
    let motion: CubismMotion = this._motions.getValue(name) as CubismMotion
    let autoDelete = false
    if (motion == null) {
      fetch(`${this._modelHomeDir}${motionFileName}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          motion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            null,
            onFinishedMotionHandler
          )
          let fadeTime: number = this._modelSetting.getMotionFadeInTimeValue(group, no)
          if (fadeTime >= 0.0) motion.setFadeInTime(fadeTime)
          fadeTime = this._modelSetting.getMotionFadeOutTimeValue(group, no)
          if (fadeTime >= 0.0) motion.setFadeOutTime(fadeTime)
          motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds)
          autoDelete = true;
        })
    } else motion.setFinishedMotionHandler(onFinishedMotionHandler)
    const voice = this._modelSetting.getMotionSoundFileName(group, no)
    if (voice.localeCompare('') != 0) {
      let path = voice
      path = this._modelHomeDir + path
      this._wavFileHandler.start(path)
    }
    if (this._debugMode) console.error(`[APP]start motion: [${group}_${no}`)
    return this._motionManager.startMotionPriority(
      motion,
      autoDelete,
      priority
    )
  }

  public startRandomMotion(
    group: string,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (this._modelSetting.getMotionCount(group) == 0) return InvalidMotionQueueEntryHandleValue
    const no: number = Math.floor(Math.random() * this._modelSetting.getMotionCount(group))
    return this.startMotion(group, no, priority, onFinishedMotionHandler)
  }

  public setExpression(expressionId: string): void {
    const motion: ACubismMotion = this._expressions.getValue(expressionId)
    if (this._debugMode) console.log(`[APP]expression: [${expressionId}]`)
    if (motion != null) {
      this._expressionManager.startMotionPriority(
        motion,
        false,
        Priority.Force
      )
    } else if (this._debugMode)
      console.log(`[APP]expression[${expressionId}] is null`)
  }

  public setRandomExpression(): void {
    if (this._expressions.getSize() == 0) {
      return
    }
    const no: number = Math.floor(Math.random() * this._expressions.getSize())
    for (let i = 0; i < this._expressions.getSize(); i++) {
      if (i == no) {
        const name: string = this._expressions._keyValues[i].first
        this.setExpression(name)
        return
      }
    }
  }

  public motionEventFired(eventValue: csmString): void {
    CubismLogInfo('{0} is fired on Model!!', eventValue.s)
  }

  public hitTest(hitArenaName: string, x: number, y: number): boolean {
    if (this._opacity < 1) return false
    const count: number = this._modelSetting.getHitAreasCount()
    for (let i = 0; i < count; i++) {
      if (this._modelSetting.getHitAreaName(i) == hitArenaName) {
        const drawId: CubismIdHandle = this._modelSetting.getHitAreaId(i)
        return this.isHit(drawId, x, y)
      }
    }
    return false
  }

  public onHit(x: number, y: number): string | undefined {
    const count: number = this._modelSetting.getHitAreasCount()
    for (let i = 0; i < count; i++) {
      let areaname = this._modelSetting.getHitAreaName(i)
      if (this.hitTest(areaname, x, y)) return areaname
    }
  }

  public preLoadMotionGroup(group: string): void {
    for (let i = 0; i < this._modelSetting.getMotionCount(group); i++) {
      const motionFileName = this._modelSetting.getMotionFileName(group, i)
      const name = `${group}_${i}`
      if (this._debugMode) {
        console.log(
          `[APP]load motion: ${motionFileName} => [${name}]`
        )
      }
      fetch(`${this._modelHomeDir}${motionFileName}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          const tmpMotion: CubismMotion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            name
          )
          let fadeTime = this._modelSetting.getMotionFadeInTimeValue(group, i)
          if (fadeTime >= 0.0) {
            tmpMotion.setFadeInTime(fadeTime)
          }
          fadeTime = this._modelSetting.getMotionFadeOutTimeValue(group, i)
          if (fadeTime >= 0.0) {
            tmpMotion.setFadeOutTime(fadeTime)
          }
          tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds)
          if (this._motions.getValue(name) != null) {
            ACubismMotion.delete(this._motions.getValue(name))
          }
          this._motions.setValue(name, tmpMotion)
          this._motionCount++
          if (this._motionCount >= this._allMotionCount) {
            this._state = LoadStep.LoadTexture
            this._motionManager.stopAllMotions()
            this._updating = false
            this._initialized = true
            this.createRenderer()
            this.setupTextures()
            this.getRenderer().startUp(this.displayer.gl)
          }
        })
    }
  }

  public releaseMotions(): void {
    this._motions.clear()
  }

  public releaseExpressions(): void {
    this._expressions.clear()
  }

  public doDraw(): void {
    if (this._model == null) return
    const viewport: number[] = [0, 0, this.displayer.canvas.width, this.displayer.canvas.height]
    const frameBuffer = this.displayer.gl.getParameter(this.displayer.gl.FRAMEBUFFER_BINDING)
    this.getRenderer().setRenderState(frameBuffer, viewport)
    this.getRenderer().drawModel()
  }

  public draw(matrix: CubismMatrix44): void {
    if (this._model == null) return
    if (this._state == LoadStep.CompleteSetup) {
      matrix.multiplyByMatrix(this._modelMatrix)
      this.getRenderer().setMvpMatrix(matrix)
      this.doDraw()
    }
  }
}

export default Model
