function XRDeviceManagerInjection() {
  class XRDeviceManager {
    constructor() {
      this.device = null;
      this.deviceKey = null;
      this.stereoEffect = null;
      this.deviceDefinitions = null;
    }

    setup(deviceDefinitions) {
      this.deviceDefinitions = deviceDefinitions;
      return this;
    }

    setSession(session) {
      this.device.setSession(session);
    }

    getGamepads() {
      const pads = [];
      const controllers = this.device.controllers;
      for (let i = 0, il = controllers.length; i < il; i++) {
        pads[i] = controllers[i].gamepad;
      }
      return pads;
    }

    serialize() {
      JSON.stringify({
        deviceKey: this.deviceKey,
        stereoEffect: this.stereoEffect
      });
    }

    deserialize(str) {
      if (!str) {
        str = '{}';
      }
      const json = JSON.parse(str);
      const deviceKey = json.deviceKey !== undefined
        ? json.deviceKey : this.deviceDefinitions.default.deviceKey;
      const stereoEffect = json.stereoEffect !== undefined
        ? json.stereoEffect : this.deviceDefinitions.default.stereoEffect;

      this._updateDevice(deviceKey);
      this._updateStereoEffect(stereoEffect);
    }

    _updateDevice(key) {
      if (this.deviceDefinitions.devices[key] === undefined) {
        key = this.deviceDefinitions.default;
      }
      if (this.deviceKey !== key) {
        this.deviceKey = key;
        this.device = new XRDevice(this.deviceDefinitions.devices[key]);

        if (navigator.xr && navigator.xr._activateDevice) {
          navigator.xr._activateDevice(this.device);
        }

        return true;
      }
      return false;
    }

    _updateStereoEffect(enabled) {
      if (this.device && this.stereoEffect !== enabled) {
        this.stereoEffect = enabled;
        this.device.enableStereoEffect(this.stereoEffect);
        return true;
      }
      return false;
    }
  }

  window.addEventListener('webxr-pose', event => {
    if (!xrDeviceManager.device) {
      return;
    }

    const positionArray = event.detail.position;
    const quaternionArray = event.detail.quaternion;
    const objectName = event.detail.objectName;

    switch (objectName) {
      case 'headset':
        xrDeviceManager.device.updateHeadsetPose(positionArray, quaternionArray);
        break;

      case 'rightHand':
      case 'leftHand':
        xrDeviceManager.device.updateControllerPose(positionArray, quaternionArray,
          objectName === 'rightHand' ? 0 : 1); // @TODO: remove magic number
        break;
    }
  }, false);

  window.addEventListener('webxr-button', event => {
    if (!xrDeviceManager.device) {
      return;
    }

    const pressed = event.detail.pressed;
    const objectName = event.detail.objectName;

    switch (objectName) {
      case 'rightHand':
      case 'leftHand':
        xrDeviceManager.device.updateControllerButtonPressed(pressed,
          objectName === 'rightHand' ? 0 : 1); // @TODO: remove magic number
        break;
    }
  }, false);

  return XRDeviceManager;
}
