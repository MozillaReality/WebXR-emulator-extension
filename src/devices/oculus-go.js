function OculusGoDeviceInjection() {
  class OculusGoDevice extends XRDeviceBase {
    constructor() {
      super();
      this.id = 'Oculus Go';
      this.modes.push('immersive-vr');
      this.headset = this._createHeadset({
        hasRotation: true
      });
      this.controllers.push(this._createController({
        hasRotation: true,
        leftRight: Controller.RIGHT
      }));
    }
  }

  return OculusGoDevice;
}
