function OculusQuestDeviceInjection() {
  class OculusQuestDevice extends XRDeviceBase {
    constructor() {
      super();
      this.id = 'Oculus Quest';
      this.modes.push('immersive-vr');
      this.headset = this._createHeadset({
        hasPosition: true,
        hasRotation: true
      });
      this.controllers.push(this._createController({
        hasPosition: true,
        hasRotation: true,
        leftRight: Controller.RIGHT
      }));
      this.controllers.push(this._createController({
        hasPosition: true,
        hasRotation: true,
        leftRight: Controller.LEFT
      }));
    }
  }

  return OculusQuestDevice;
}
