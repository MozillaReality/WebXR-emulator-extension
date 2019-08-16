function ControllerInjection() {
  class Controller extends EventTarget {
    constructor(options = {}) {
      super();

      this.hasPosition = options.hasPosition !== undefined ? options.hasPosition : false;
      this.hasRotation = options.hasPosition !== undefined ? options.hasRotation : false;

      this.gamepad = {
        pose: {
          hasPosition: this.hasPosition,
          position: [0, 0, 0],
          orientation: [0, 0, 0, 1]
        },
        buttons: [
          {pressed: false},
          {pressed: false}
        ],
        mapping: 'xr-standard',
        axes: [0, 0]
      };

      this.position = new _Math.Vector3();
      this.quaternion = new _Math.Quaternion();
      this.scale = new _Math.Vector3(1, 1, 1);
      this.matrix = new _Math.Matrix4();
    }

    // @TODO: any better method name?
    init() {
      this.updatePose(this.position.toArray([]), this.quaternion.toArray([]));
    }

    updatePose(positionArray, quaternionArray) {
      this.position.fromArray(positionArray);
      this.quaternion.fromArray(quaternionArray);

      this.matrix.compose(this.position, this.quaternion, this.scale);

      this.position.toArray(this.gamepad.pose.position);
      this.quaternion.toArray(this.gamepad.pose.orientation);

      this.dispatchEvent(new ControllerPoseUpdateEvent('poseupdate', this.matrix));
    }

    updateButtonPressed(pressed) {
      // @TODO: support various type of buttons
      if (pressed && !this.gamepad.buttons[1].pressed) {
        this.gamepad.buttons[1].pressed = true;
        this.dispatchEvent(new Event('buttonpress'));
      } else if (!pressed && this.gamepad.buttons[1].pressed) {
        this.gamepad.buttons[1].pressed = false;
        this.dispatchEvent(new Event('buttonrelease'));
      }
    }
  }

  class ControllerPoseUpdateEvent extends Event {
    constructor(type, matrix) {
      super(type);
      this.matrix = [];
      matrix.toArray(this.matrix);
    }
  }

  return Controller;
}
