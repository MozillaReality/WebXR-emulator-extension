function XRDeviceManagerInjection() {
  class XRDeviceManager {
    constructor() {
      this.deviceType = null;
      this.stereoType = null;
      this.device = null;
    }

    create(type) {
      const deviceTypes = XRDeviceManager.deviceTypes();
      switch(type) {
        case deviceTypes.OculusGo:
          return new OculusGoDevice();
        case deviceTypes.OculusQuest:
          return new OculusQuestDevice();
        case deviceTypes.None:
        default:
          return new XRDeviceBase();
      }
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
      return [
        this.deviceType,
        this.stereoType
      ].join(':');
    }

    deserialize(str) {
      const defaultValues = XRDeviceManager.defaultValues();
      const values = str.split(':');

      let deviceType = parseInt(values[0]);
      let stereoType = parseInt(values[1]);

      if (isNaN(deviceType)) {
        deviceType = defaultValues.deviceType;
      }

      if (isNaN(stereoType)) {
        stereoType = defaultValues.stereoType;
      }

      this._updateDeviceType(deviceType);
      this._updateStereoType(stereoType);
    }

    _updateDeviceType(type) {
      if (this.deviceType !== type) {
        this.deviceType = type;
        this.device = this.create(this.deviceType);

        if (navigator.xr && navigator.xr._activateDevice) {
          navigator.xr._activateDevice(this.device);
        }

        return true;
      }
      return false;
    }

    _updateStereoType(type) {
      if (this.device && this.stereoType !== type) {
        this.stereoType = type;
        this.device.enableStereo(this.stereoType);
        return true;
      }
      return false;
    }

    // @TODO: the following configuration values should be from configuration.js

    static deviceTypes() {
      return {
        None: 0,
        OculusGo: 1,
        OculusQuest: 2
      };
    }

    static stereoTypes() {
      return {
        Enable: 0,
        Disable: 1
      };
    }

    static defaultValues() {
      return {
        deviceType: XRDeviceManager.deviceTypes().OculusGo,
        stereoType: XRDeviceManager.stereoTypes().Enable
      };
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
