import { csmVector, iterator } from '@framework/type/csmvector'

export class TextureInfo {
  constructor (
    public img: HTMLImageElement,
    public id: WebGLTexture = null,
    public width = 0,
    public height = 0,
    public usePremultply: boolean,
    public fileName: string
  ) {}
}

class TextureManager {
  textures: csmVector<TextureInfo>

  constructor(public gl: WebGLRenderingContext) {
    this.textures = new csmVector<TextureInfo>()
  }

  public release(): void {
    for (
      let ite: iterator<TextureInfo> = this.textures.begin();
      ite.notEqual(this.textures.end());
      ite.preIncrement()
    ) {
      this.gl.deleteTexture(ite.ptr().id)
    }
    this.textures = null
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

  public releaseTextures(): void {
    for (let i = 0; i < this.textures.getSize(); i++) this.textures.set(i, null)
    this.textures.clear()
  }

  public releaseTextureByTexture(texture: WebGLTexture): void {
    for (let i = 0; i < this.textures.getSize(); i++) {
      if (this.textures.at(i).id != texture) continue
      this.textures.set(i, null)
      this.textures.remove(i)
      break
    }
  }

  public releaseTextureByFilePath(fileName: string): void {
    for (let i = 0; i < this.textures.getSize(); i++) {
      if (this.textures.at(i).fileName != fileName) continue
      this.textures.set(i, null)
      this.textures.remove(i)
      break
    }
  }
}

export default TextureManager
