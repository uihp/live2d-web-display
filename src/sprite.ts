import Displayer from "./displayer"

export class Rect {
  constructor (
    public left: number,
    public right: number,
    public up: number,
    public down: number
  ) {}
}

class Sprite {
  texture: WebGLTexture
  vertexBuffer: WebGLBuffer
  uvBuffer: WebGLBuffer
  indexBuffer: WebGLBuffer
  rect: Rect
  positionLocation: number
  uvLocation: number
  textureLocation: WebGLUniformLocation
  positionArray: Float32Array
  uvArray: Float32Array
  indexArray: Uint16Array
  firstDraw: boolean
  displayer: Displayer

  constructor (
    x: number,
    y: number,
    width: number,
    height: number,
    textureId: WebGLTexture,
    displayer: Displayer
  ) {
    this.rect = new Rect(
      x - width * 0.5,
      x + width * 0.5,
      y + height * 0.5,
      y - height * 0.5
    )
    this.texture = textureId
    this.displayer = displayer
    this.vertexBuffer = null
    this.uvBuffer = null
    this.indexBuffer = null
    this.positionLocation = null
    this.uvLocation = null
    this.textureLocation = null
    this.positionArray = null
    this.uvArray = null
    this.indexArray = null
  }

  public initialize(programId: WebGLProgram): void {
    this.positionLocation = this.displayer.gl.getAttribLocation(programId, 'position')
    this.displayer.gl.enableVertexAttribArray(this.positionLocation)
    this.uvLocation = this.displayer.gl.getAttribLocation(programId, 'uv')
    this.displayer.gl.enableVertexAttribArray(this.uvLocation)
    this.textureLocation = this.displayer.gl.getUniformLocation(programId, 'texture')
    this.displayer.gl.uniform1i(this.textureLocation, 0)
    this.uvArray = new Float32Array([1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0])
    this.uvBuffer = this.displayer.gl.createBuffer()
    const maxWidth = this.displayer.canvas.width
    const maxHeight = this.displayer.canvas.height
    this.positionArray = new Float32Array([
      (this.rect.right - maxWidth * 0.5) / (maxWidth * 0.5),
      (this.rect.up - maxHeight * 0.5) / (maxHeight * 0.5),
      (this.rect.left - maxWidth * 0.5) / (maxWidth * 0.5),
      (this.rect.up - maxHeight * 0.5) / (maxHeight * 0.5),
      (this.rect.left - maxWidth * 0.5) / (maxWidth * 0.5),
      (this.rect.down - maxHeight * 0.5) / (maxHeight * 0.5),
      (this.rect.right - maxWidth * 0.5) / (maxWidth * 0.5),
      (this.rect.down - maxHeight * 0.5) / (maxHeight * 0.5)
    ])
    this.vertexBuffer = this.displayer.gl.createBuffer()
    this.indexArray = new Uint16Array([0, 1, 2, 3, 2, 0])
    this.indexBuffer = this.displayer.gl.createBuffer()
  }

  public release(): void {
    this.rect = null
    this.displayer.gl.deleteTexture(this.texture)
    this.texture = null
    this.displayer.gl.deleteBuffer(this.uvBuffer)
    this.uvBuffer = null
    this.displayer.gl.deleteBuffer(this.vertexBuffer)
    this.vertexBuffer = null
    this.displayer.gl.deleteBuffer(this.indexBuffer)
    this.indexBuffer = null
  }

  public render(): void {
    if (this.texture == null) return
    this.displayer.gl.bindBuffer(this.displayer.gl.ARRAY_BUFFER, this.uvBuffer)
    this.displayer.gl.bufferData(this.displayer.gl.ARRAY_BUFFER, this.uvArray, this.displayer.gl.STATIC_DRAW)
    this.displayer.gl.vertexAttribPointer(this.uvLocation, 2, this.displayer.gl.FLOAT, false, 0, 0)
    this.displayer.gl.bindBuffer(this.displayer.gl.ARRAY_BUFFER, this.vertexBuffer)
    this.displayer.gl.bufferData(this.displayer.gl.ARRAY_BUFFER, this.positionArray, this.displayer.gl.STATIC_DRAW)
    this.displayer.gl.vertexAttribPointer(this.positionLocation, 2, this.displayer.gl.FLOAT, false, 0, 0)
    this.displayer.gl.bindBuffer(this.displayer.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    this.displayer.gl.bufferData(this.displayer.gl.ELEMENT_ARRAY_BUFFER, this.indexArray, this.displayer.gl.DYNAMIC_DRAW)
    this.displayer.gl.bindTexture(this.displayer.gl.TEXTURE_2D, this.texture)
    this.displayer.gl.drawElements(
      this.displayer.gl.TRIANGLES,
      this.indexArray.length,
      this.displayer.gl.UNSIGNED_SHORT,
      0
    )
  }

  public isHit(pointX: number, pointY: number): boolean {
    const { height } = this.displayer.canvas
    const y = height - pointY
    return (
      pointX >= this.rect.left &&
      pointX <= this.rect.right &&
      y <= this.rect.up &&
      y >= this.rect.down
    )
  }
}

export default Sprite
