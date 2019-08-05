function OculusGoDeviceInjection() {

  class OculusGoDevice extends XRDeviceBase {
    constructor() {
      super();
      this.id = 'Oculus Go';
      this.modes.push('immersive-vr');
      this.headset = new Headset(this, false, true);
      this.controllers = [
        new Controller(this, false, true, 0)
      ];
    }
  }

  return OculusGoDevice;
}
