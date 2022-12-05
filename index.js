window.onload = () => {
  canvas.width = document.body.clientWidth
  canvas.height = document.body.clientHeight
  displayer = new Live2DWebDisplay.Displayer(canvas, {
    modelConfigs: [
      {
        dirPath: 'res/Haru/',
        fileName: 'Haru.model3.json',
        idle: 'Idle',
        expression: 'Head',
        interaction: {
          'Body': 'TapBody'
        }
      },
      {
        dirPath: 'res/Hiyori/',
        fileName: 'Hiyori.model3.json',
        idle: 'Idle',
        interaction: {
          'Body': 'TapBody'
        }
      },
      {
        dirPath: 'res/Rice/',
        fileName: 'Rice.model3.json',
        idle: 'Idle',
        interaction: {
          'Body': 'TapBody'
        }
      },
      {
        dirPath: 'res/Mao/',
        fileName: 'Mao.model3.json',
        idle: 'Idle',
        expression: 'Head',
        interaction: {
          'Body': 'TapBody'
        }
      },
      {
        dirPath: 'res/Mark/',
        fileName: 'Mark.model3.json',
        idle: 'Idle',
        interaction: {
          'Body': 'TapBody'
        }
      }
    ]
  })
  displayer.initialize()
  displayer.run()
  this.displayer = displayer
}
window.onbeforeunload = () => this.displayer.release()
button.onclick = () => this.displayer.manager.nextScene()
