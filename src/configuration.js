function ConfigurationInjection() {
  'use strict';

  class Configuration extends EventDispatcher {
    constructor() {
      super();
      this.deviceType = Configuration.defaultValues().deviceType;
      this.stereoType = Configuration.defaultValues().stereoType;
    }

    setDeviceType(type) {
      this.deviceType = type;
      this.dispatchEvent('typechange', {type: 'typechange', configuration: this});
    }

    setStereoType(type) {
      this.deviceType = type;
      this.dispatchEvent('typechange', {type: 'typechange', configuration: this});
    }

    serialize() {
      return [
        this.deviceType,
        this.stereoType
      ].join(':');
    }

    deserialize(str) {
      const defaultValues = Configuration.defaultValues();
      const values = str.split(':');

      this.deviceType = parseInt(values[0]);
      this.stereoType = parseInt(values[1]);

      if (isNaN(this.deviceType)) {
        this.deviceType = defaultValues.deviceType;
      }

      if (isNaN(this.stereoType)) {
        this.stereoType = defaultValues.stereoType;
      }

      this.dispatchEvent('typechange', {type: 'typechange', configuration: this});
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
    };

    static defaultValues() {
      return {
        deviceType: Configuration.deviceTypes().OculusGo,
        stereoType: Configuration.stereoTypes().Enable
      };
    }
  }

  return Configuration;
}
