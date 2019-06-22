function XRDeviceBaseInjection() {

  class XRDeviceBase extends EventTarget {
    constructor() {
      super();
      this.id = 'None';
      this.modes = ['inline'];
      this.headset = null;
      this.controller = null;
      this.session = null;
    }

    setSession(session) {
      this.session = session;
      this.dispatchEvent(new Event('sessionupdate'));
    }

    enableStereo(type) {
      if (this.headset) {
        this.headset.enableStereo(type === XRDeviceManager.stereoTypes().Enable);
      }
    }
  }

  return XRDeviceBase;
}
