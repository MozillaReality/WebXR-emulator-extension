function ConfigurationInjection() {
  'use strict';

  class Configuration extends EventDispatcher {
    constructor() {
      super();
      this.deviceType = Configuration.deviceTypes().None;
    }

    setDeviceType(type) {
      this.deviceType = type;
      this.dispatchEvent('devicechange', {type: 'devicechange', configuration: this});
    }

    static deviceTypes() {
      return {
        None: 0,
        OculusGo: 1,
        OculusQuest: 2
      };
    }
  }

  return Configuration;
}
