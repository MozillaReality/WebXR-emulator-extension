function ConfigurationInjection() {
  'use strict';

  class Configuration {
    constructor() {
      this.headsetType = null;
    }

    setHeadsetType(type) {
      this.headsetType = type;
    }

    static headsetTypes() {
      return {
        None: 0,
        OculusGo: 1,
        OculusQuest: 2
      };
    }
  }

  return Configuration;
}
