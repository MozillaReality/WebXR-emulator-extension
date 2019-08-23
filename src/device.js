function XRDeviceInjection() {
  class XRDevice extends EventTarget {
    constructor(options = {}) {
      super();

      this.id = options.id !== undefined ? options.id : '';
      this.name = options.name !== undefined ? options.name : '';

      this.modes = [];

      if (options.modes !== undefined) {
        for (const mode of options.modes) {
          this.modes.push(mode);
        }
      }

      this.headset = options.headset !== undefined
        ? this._createHeadset(options.headset) : null;

      this.controllers = [];

      if (options.controllers !== undefined) {
        for (const parameter of options.controllers) {
          this.controllers.push(this._createController(parameter));
        }
      }

      this.session = null;
    }

    setSession(session) {
      this.session = session;

      if (this.headset) {
        this.headset.init(session.renderState);
      }

      for (let i = 0, il = this.controllers.length; i < il; i++) {
        this.controllers[i].init();
      }
    }

    enableStereoEffect(enabled) {
      if (this.headset) {
        this.headset.enableStereoEffect(enabled);
      }
    }

    updateHeadsetPose(positionArray, quaternionArray) {
      if (this.headset) {
        this.headset.updatePose(positionArray, quaternionArray);
      }
    }

    updateControllerPose(positionArray, quaternionArray, index) {
      if (this.controllers.length > index) {
        this.controllers[index].updatePose(positionArray, quaternionArray);
      }
    }

    updateControllerButtonPressed(pressed, index) {
      if (this.controllers.length > index) {
        this.controllers[index].updateButtonPressed(pressed);
      }
    }

    _createHeadset(options = {}) {
      const headset = new Headset(options);

      headset.addEventListener('viewposeupdate', event => {
        if (this.session) {
          this.session._notifyViewerPoseUpdated(event.viewMatrices, event.viewMatrixInverses,
            event.positions, event.orientations);
        }
      }, false);

      headset.addEventListener('projectionmatricesupdate', event => {
        if (this.session) {
          this.session._notifyProjectionMatricesUpdated(event.projectionMatrices);
        }
      }, false);

      headset.addEventListener('viewportsupdate', event => {
        if (this.session) {
          this.session._notifyViewportsUpdated(event.viewports);
        }
      }, false);

      return headset;
    }

    _createController(options = {}) {
      const controller = new Controller(options);

      controller.addEventListener('poseupdate', event => {
        if (this.session) {
          for (let i = 0, il = this.controllers.length; i < il; i++) {
            if (this.controllers[i] === event.target) {
              this.session._notifyControllerPoseUpdated(i, event.matrix,
                event.position, event.orientation);
            }
          }
        }
      }, false);

      controller.addEventListener('buttonpress', event => {
        if (this.session) {
          for (let i = 0, il = this.controllers.length; i < il; i++) {
            if (this.controllers[i] === event.target) {
              this.session._notifyControllerButtonPressed(i);
            }
          }
        }
      }, false);

      controller.addEventListener('buttonrelease', event => {
        if (this.session) {
          for (let i = 0, il = this.controllers.length; i < il; i++) {
            if (this.controllers[i] === event.target) {
              this.session._notifyControllerButtonReleased(i);
            }
          }
        }
      }, false);

      return controller;
    }
  }

  return XRDevice;
}
