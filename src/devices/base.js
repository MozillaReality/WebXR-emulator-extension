function XRDeviceBaseInjection() {
  class XRDeviceBase extends EventTarget {
    constructor() {
      super();
      this.id = 'None';
      this.modes = ['inline'];
      this.headset = null;
      this.controllers = [];
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

    enableStereo(type) {
      if (this.headset) {
        this.headset.enableStereo(type === XRDeviceManager.stereoTypes().Enable);
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

  return XRDeviceBase;
}
