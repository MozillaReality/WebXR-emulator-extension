function XRDeviceManagerInjection() {
  'use strict';

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
      const array = [];
      const controllers = this.device.controllers;
      for (let i = 0, il = controllers.length; i < il; i++) {
        array[i] = controllers[i].getGamepad();
      }
      return array;
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
    const position = event.detail.position;
    const quaternion = event.detail.quaternion;

    switch (event.detail.object) {
      case 'headset':
        if (!xrDeviceManager.device.headset) {
          return;
        }
        xrDeviceManager.device.headset.updatePose(position, quaternion);
        break;

      case 'rightHand':
        if (xrDeviceManager.device.controllers.length < 1) {
          return;
        }
        xrDeviceManager.device.controllers[0].updatePose(position, quaternion);
        break;

      case 'leftHand':
        if (xrDeviceManager.device.controllers.length < 2) {
          return;
        }
        xrDeviceManager.device.controllers[1].updatePose(position, quaternion);
        break;
    }
  }, false);

  window.addEventListener('webxr-button', event => {
    const pressed = event.detail.pressed;

    switch (event.detail.object) {
      case 'rightHand':
        if (xrDeviceManager.device.controllers.length < 1) {
          return;
        }
        xrDeviceManager.device.controllers[0].updateButtonPressed(pressed);
        break;

      case 'leftHand':
        if (xrDeviceManager.device.controllers.length < 2) {
          return;
        }
        xrDeviceManager.device.controllers[1].updateButtonPressed(pressed);
        break;
    }
  }, false);

  return XRDeviceManager;
}
