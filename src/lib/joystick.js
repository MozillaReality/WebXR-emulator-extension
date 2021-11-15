const CIRCUMFERENCE = 2 * Math.PI;
const LINEWIDTH = 1;
const OUTER_STROKE_COLOR = "#000000";
const INNER_STROKE_COLOR = "#000000";
const INNER_FILL_COLOR = "#A9A9A9";

class Joystick {
  constructor(radius, autoReturn){
    this._radius = radius;
    this._autoReturn = autoReturn;
    
    let canvas = document.createElement("canvas");
    canvas.id = 'Joystick';
    canvas.width = radius;
    canvas.height = radius;
    this._canvas = canvas;
    
    this._pressed = false;
    this._innerRadius = radius/6;
    this._outerRadius = radius/3;
    this._maxStickDelta = this._outerRadius;

    this._centerX = radius/2;
    this._centerY = radius/2;
    this._deltaX = 0;
    this._deltaY = 0;

    canvas.addEventListener("mousedown", this._onMouseDown.bind(this), false);
    document.addEventListener("mousemove", this._onMouseMove.bind(this), false);
    document.addEventListener("mouseup", this._onMouseUp.bind(this), false);

    this._drawOuterCircle();
    this._drawInnerCircle();

  }

  _drawOuterCircle() {
    let context = this._canvas.getContext('2d');
    context.beginPath();
    context.arc(this._centerX, this._centerY, this._outerRadius, 0, CIRCUMFERENCE, false);

    context.lineWidth = LINEWIDTH;
    context.strokeStyle = OUTER_STROKE_COLOR;
    context.stroke();
  }

  _drawInnerCircle() {
    let context = this._canvas.getContext('2d');
    context.beginPath();
    let deltaDistance = Math.sqrt(this._deltaX * this._deltaX + this._deltaY * this._deltaY);
    let scaleFactor = deltaDistance / this._maxStickDelta;
    if (scaleFactor > 1) {
      this._deltaX /= scaleFactor;
      this._deltaY /= scaleFactor;
    }
    context.arc(this._deltaX + this._centerX, this._deltaY + this._centerY, this._innerRadius, 0, CIRCUMFERENCE, false);

    context.fillStyle = INNER_FILL_COLOR;
    context.fill();
    context.lineWidth = LINEWIDTH;
    context.strokeStyle = INNER_STROKE_COLOR;
    context.stroke();
  }

  _onMouseDown(_event) {
    this._pressed = true;
  }

  _onMouseUp(_event) {
    let context = this._canvas.getContext('2d');
    this._pressed = false;

    if (this._autoReturn) {
      this._deltaX = 0;
      this._deltaY = 0;
    }
    
    context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    
    this._drawOuterCircle();
    this._drawInnerCircle();
  }

  _onMouseMove(event) {
    if (this._pressed) {
      let context = this._canvas.getContext('2d');
      this._deltaX = event.pageX-this._centerX;
      this._deltaY = event.pageY-this._centerY;
      
      if (this._canvas.offsetParent.tagName.toUpperCase() === "BODY") {
        this._deltaX -= this._canvas.offsetLeft;
        this._deltaY -= this._canvas.offsetTop;
      } else {
        this._deltaX -= this._canvas.offsetParent.offsetLeft;
        this._deltaY -= this._canvas.offsetParent.offsetTop;
      }
      
      context.clearRect(0, 0, this._canvas.width, this._canvas.height);
      
      this._drawOuterCircle();
      this._drawInnerCircle();
    }
  }

  addToParent(parent) {
    parent.appendChild(this._canvas);
  }

  getX() {
    return (100 * (this._deltaX / this._maxStickDelta)).toFixed()/100;
  }

  getY() {
    return (100 * (this._deltaY / this._maxStickDelta)).toFixed()/100;
  }

}