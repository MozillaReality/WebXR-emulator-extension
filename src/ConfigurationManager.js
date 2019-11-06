// @TODO: write json format comment

class ConfigurationManager {
  constructor(deviceDefinitions) {
    this._deviceDefinitions = deviceDefinitions;
    this._deviceKey = this.defaultDeviceKey;
    this._stereoEffect = this.defaultStereoEffect;
    this._storageKey = 'webxr-extension';
  }

  static createFromJsonFile(path) {
    return new Promise((resolve, reject) => {
      fetch(chrome.runtime.getURL(path))
        .then(response => response.json())
        .then(json => {
          resolve(new ConfigurationManager(json));
        });
    });
  }

  // exposed attributes

  get deviceKey() {
    return this._deviceKey;
  }

  get deviceDefinition() {
    // @TODO: throw error if deviceKey isn't valid?
    return this._deviceDefinitions.devices[this.deviceKey];
  }

  get stereoEffect() {
    return this._stereoEffect;
  }

  get defaultDeviceKey() {
    // @TODO: throw error if .default.deviceKey is undefined?
    return this._deviceDefinitions.default.deviceKey;
  }

  get defaultStereoEffect() {
    // @TODO: throw error if .default.stereoEffect is undefined?
    return this._deviceDefinitions.default.stereoEffect;
  }

  get devices() {
    return this._deviceDefinitions.devices;
  }

  // exposed methods

  serialize() {
    return JSON.stringify({
      deviceKey: this.deviceKey,
      stereoEffect: this.stereoEffect
    });
  }

  deserialize(str) {
    if (!str) { str = '{}'; }
    const json = JSON.parse(str);
    const deviceKey = this._validDeviceKey(json.deviceKey)
      ? json.deviceKey : this.defaultDeviceKey;
    const stereoEffect = json.stereoEffect !== undefined
      ? json.stereoEffect : this.defaultStereoEffect;

    this.updateDeviceKey(deviceKey);
    this.updateStereoEffect(stereoEffect);
  }

  updateDeviceKey(key) {
    if (!this._validDeviceKey(key)) {
      // @TODO: throw error?
      return false;
    }
    if (this._deviceKey !== key) {
      this._deviceKey = key;
      return true;
    }
    return false;
  }

  updateStereoEffect(enabled) {
    if (this._stereoEffect !== enabled) {
      this._stereoEffect = enabled;
      return true;
    }
    return false;
  }

  loadFromStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(this._storageKey, result => {
        this.deserialize(result[this._storageKey] || '');
        resolve(result);
      });
    });
  }

  storeToStorage() {
    return new Promise((resolve, reject) => {
      const storedValue = {};
      storedValue[this._storageKey] = this.serialize();
      chrome.storage.local.set(storedValue, () => {
        resolve(storedValue);
      });
    });
  }

  // private methods

  _validDeviceKey(key) {
    return this._deviceDefinitions.devices[key] !== undefined;
  }
}
