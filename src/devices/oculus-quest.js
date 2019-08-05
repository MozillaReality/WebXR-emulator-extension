function OculusQuestDeviceInjection() {

  class OculusQuestDevice extends XRDeviceBase {
    constructor() {
      super();
      this.id = 'Oculus Quest';
      this.modes.push('immersive-vr');
      this.headset = new Headset(this, true, true);
      this.controllers = [
        new Controller(this, true, true, 0)
      ];
    }
  }

  return OculusQuestDevice;
}
