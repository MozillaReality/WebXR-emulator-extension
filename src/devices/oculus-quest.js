function OculusQuestDeviceInjection() {

  class OculusQuestDevice extends XRDeviceBase {
    constructor() {
      super();
      this.id = 'Oculus Quest';
      this.modes.push('immersive-vr');
      this.headset = new Headset(this, true, true);
      this.controller = new Controller(this, true, true);
    }
  }

  return OculusQuestDevice;
}
