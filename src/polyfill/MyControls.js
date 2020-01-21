import {
  Euler,
  EventDispatcher,
  Quaternion,
  Vector2,
  Vector3
} from 'three';

const STATE = {
  NONE: -1,
  ROTATE: 0,
  FORWARD: 1,
  PAN: 2
};

const MOUSE = {
  ROTATE: 0,
  FORWARD: 1,
  PAN: 2
};

const changeEvent = {type: 'change'};
const EPS = 0.000001;

// @TODO: Rename
export default class MyControls extends EventDispatcher {
  constructor(object, domElement) {
    super();
    this.object = object;
    this.domElement = domElement;
    this._enabled = true;
    this.state = STATE.NONE;
    this.screen = { left: 0, top: 0, width: 0, height: 0 };
    this.rotateSpeed = 1.0;
    this.forwardSpeed = 1.0;
    this.panSpeed = 1.0;

    this._rotateStart = new Vector2();
    this._rotateEnd = new Vector2();
    this._forwardStart = new Vector2();
    this._forwardEnd = new Vector2();
    this._panStart = new Vector2();
    this._panEnd = new Vector2();

    domElement.addEventListener('mousedown', event => {
      if (!this.enabled || this.state !== STATE.NONE) {
        return;
      }
      switch (event.button) {
        case MOUSE.ROTATE:
          this.state = STATE.ROTATE;
          break;
        case MOUSE.FORWARD:
          this.state = STATE.FORWARD;
          break;
        case MOUSE.PAN:
          this.state = STATE.PAN;
          break;
      }
      switch (this.state) {
        case STATE.ROTATE:
          this._rotateStart.copy(getMouseOnScreen(event));
          this._rotateEnd.copy(this._rotateStart);
          break;
        case STATE.FORWARD:
          this._forwardStart.copy(getMouseOnScreen(event));
          this._forwardEnd.copy(this._forwardStart);
          break;
        case STATE.PAN:
          this._panStart.copy(getMouseOnScreen(event));
          this._panEnd.copy(this._panStart);
          break;
      }
    }, false);

    domElement.addEventListener('mouseup', event => {
      if (!this.enabled || this.state === STATE.NONE) {
        return;
      }
      switch (this.state) {
        case STATE.ROTATE:
          this._rotateEnd.copy(getMouseOnScreen(event));
          break;
        case STATE.FORWARD:
          this._forwardEnd.copy(getMouseOnScreen(event));
          break;
        case STATE.PAN:
          this._panEnd.copy(getMouseOnScreen(event));
          break;
      }
      this.state = STATE.NONE;
    }, false);

    domElement.addEventListener('mousemove', event => {
      if (!this.enabled || this.state === STATE.NONE) {
        return;
      }
      switch (this.state) {
        case STATE.ROTATE:
          this._rotateEnd.copy(getMouseOnScreen(event));
          break;
        case STATE.FORWARD:
          this._forwardEnd.copy(getMouseOnScreen(event));
          break;
        case STATE.PAN:
          this._panEnd.copy(getMouseOnScreen(event));
          break;
      }
    }, false);

    domElement.addEventListener('wheel', event => {
      if (!this.enabled) {
        return;
      }
      event.preventDefault();
      if (this.state !== STATE.NONE) {
        return;
      }
      this._forwardStart.set(0, 0);
      this._forwardEnd.set(0, 0);
      switch (event.deltaMode) {
        case 0: // in pixels
          this._forwardEnd.y += event.deltaY * 0.000025;
          break;
        case 1: // in lines
          this._forwardEnd.y += event.deltaY * 0.001;
          break;          
        case 2: // in pages
          this._forwardEnd.y += event.deltaY * 0.0025;
          break;
      }
      this.forwardCamera();
    }, false);

    const vector2 = new Vector2();
    const getMouseOnScreen = (pageX, pageY) => {
      const rect = domElement.getBoundingClientRect();
      // left-top (0, 0), right-bottom (1, 1)
      vector2.set(
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height
      );
      return vector2;
    }

    this.update();
  }

  rotateCamera() {
    // @TODO: Can be optimized?
    const vector2 = new Vector2().copy(this._rotateEnd).sub(this._rotateStart);
    const rotation = new Vector3(vector2.y, vector2.x, 0);
    const quaternion = new Quaternion().setFromEuler(new Euler().setFromVector3(rotation));
    this.object.quaternion.multiply(quaternion);
    this._rotateStart.copy(this._rotateEnd);
    this.dispatchEvent(changeEvent);
  }

  forwardCamera() {
    const vector2 = new Vector2().copy(this._forwardEnd).sub(this._forwardStart);
    const direction = new Vector3(0, 0, vector2.y).applyQuaternion(this.object.quaternion);
    this.object.position.add(direction) * this.forwardSpeed;
    this._forwardStart.copy(this._forwardEnd);
    this.dispatchEvent(changeEvent);
  }

  panCamera() {
    const vector2 = new Vector2().copy(this._panEnd).sub(this._panStart);
    const direction = new Vector3(-vector2.x, vector2.y, 0).applyQuaternion(this.object.quaternion);
    this.object.position.add(direction) * this.panSpeed;
    this._panStart.copy(this._panEnd);
    this.dispatchEvent(changeEvent);
  }

  update() {
    if (!this.enabled) {
      return;
    }
    switch (this.state) {
      case STATE.ROTATE:
        this.rotateCamera();
        break;
      case STATE.FORWARD:
        this.forwardCamera();
        break;
      case STATE.PAN:
        this.panCamera();
        break;
    }
  }

  dispose() {
    // @TODO: Implement
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(value) {
    this._enabled = value;
    if (!value) {
      this.state = STATE.NONE;
      this._rotateStart.copy(this._rotateEnd);
      this._forwardStart.copy(this._forwardEnd);
      this._panStart.copy(this._panEnd);
    }
  }
}