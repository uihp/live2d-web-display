import { modelConfigs } from './config.js'

var displayer

window.onload = () => {
  canvas.width = document.body.clientWidth
  canvas.height = document.body.clientHeight
  displayer = new Live2DWebDisplay.Displayer(canvas, { modelConfigs })
  displayer.initialize()
  displayer.run()
}
window.onbeforeunload = () => displayer.release()
button.onclick = () => displayer.manager.nextScene()
