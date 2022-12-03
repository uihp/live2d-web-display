window.onload = () => {
  this.displayer = new Live2DWebDisplay.Displayer(canvas, {
    size: 'auto'
  })
  this.displayer.initialize()
  this.displayer.run()
}
window.onbeforeunload = () => this.displayer.release()
button.onclick = () => this.displayer.manager.nextScene()
