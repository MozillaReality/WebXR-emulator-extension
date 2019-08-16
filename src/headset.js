function HeadsetInjection() {
  const tmpVector3 = new _Math.Vector3();
  const tmpMatrix3 = new _Math.Matrix3();

  const axises = {
    x: new _Math.Vector3(1, 0, 0),
    y: new _Math.Vector3(0, 1, 0),
    z: new _Math.Vector3(0, 0, 1)
  };

  class Headset extends EventTarget {
    constructor(options = {}) {
      super();

      this.hasPosition = options.hasPosition !== undefined ? options.hasPosition : false;
      this.hasRotation = options.hasRotation !== undefined ? options.hasRotation : false;
      this.stereoEnabled = true;

      this.position = new _Math.Vector3();
      this.quaternion = new _Math.Quaternion();
      this.scale = new _Math.Vector3(1, 1, 1);
      this.matrix = new _Math.Matrix4();
      this.matrixInverse = new _Math.Matrix4();
      this.viewMatrices = [
        new _Math.Matrix4(),
        new _Math.Matrix4()
      ];
      this.viewMatrixInverses = [
        new _Math.Matrix4(),
        new _Math.Matrix4()
      ];
      this.projectionMatrices = [
        new _Math.Matrix4(),
        new _Math.Matrix4()
      ];
      this.viewports = [
        new _Math.Vector4(),
        new _Math.Vector4()
      ];
    }

    // @TODO: any better method name?
    init(renderState) {
      this.updateViewports();
      this.updateProjectionMatrices(renderState);
      this.updatePose(this.position.toArray([]), this.quaternion.toArray([]));
    }

    enableStereo(enable) {
      this.stereoEnabled = enable;
    }

    updatePose(positionArray, quaternionArray) {
      this.position.fromArray(positionArray);
      this.quaternion.fromArray(quaternionArray);

      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.matrixInverse.getInverse(this.matrix);
      this._updateViewMatrices();

      this.dispatchEvent(new HeadsetPoseUpdateEvent('viewposeupdate',
        this.viewMatrices, this.viewMatrixInverses));
    }

    updateProjectionMatrices(renderState) {
      const depthNear = renderState.depthNear;
      const depthFar = renderState.depthFar;
      const inlineVerticalFieldOfView = renderState.inlineVerticalFieldOfView;
      const aspect = window.innerWidth / window.innerHeight * (this.stereoEnabled ? 0.5 : 1.0);

      for (let i = 0; i < 2; i++) {
        const fov = inlineVerticalFieldOfView * 180 / Math.PI
        this._updateProjectionMatrix(fov, aspect, depthNear, depthFar, this.projectionMatrices[i]);
      }

      this.dispatchEvent(new HeadsetProjectionMatricesUpdateEvent(
        'projectionmatricesupdate', this.projectionMatrices));
    }

    _updateProjectionMatrix(fov, aspect, near, far, projectionMatrix) {
      const zoom = 1;
      const top = near * Math.tan(Math.PI / 180 * 0.5 * fov) / zoom;
      const height = 2 * top;
      const width = aspect * height;
      const left = -0.5 * width;
      projectionMatrix.makePerspective(left, left + width, top, top - height, near, far);
    }

    updateViewports() {
      for (let i = 0; i < 2; i++) {
        const viewport = this.viewports[i];

        if (this.stereoEnabled) {
          viewport.x = i === 0 ? 0 : window.innerWidth / 2 * window.devicePixelRatio;
          viewport.z = window.innerWidth / 2 * window.devicePixelRatio;
        } else {
          viewport.x = i === 0 ? 0 : window.innerWidth * window.devicePixelRatio;
          viewport.z = i === 0 ? window.innerWidth * window.devicePixelRatio : 0;
        }

        viewport.y = 0;
        viewport.w = window.innerHeight * window.devicePixelRatio;
      }

      this.dispatchEvent(new HeadsetViewportsUpdateEvent(
        'viewportsupdate', this.viewports));
    }

    _translateOnAxis(position, matrix, axis, distance) {
      tmpVector3.copy(axis).applyMatrix3(tmpMatrix3.setFromMatrix4(matrix));
      position.x += tmpVector3.x * distance;
      position.y += tmpVector3.y * distance;
      position.z += tmpVector3.z * distance;
      return position;
    }

    _updateViewMatrices() {
      if (this.stereoEnabled) {
        // for left eye
        this._translateOnAxis(this.position, this.matrix, axises.x, -0.02);
        this.viewMatrices[0].compose(this.position, this.quaternion, this.scale);
        this.viewMatrixInverses[0].getInverse(this.viewMatrices[0]);

        // for right eye
        this._translateOnAxis(this.position, this.matrix, axises.x, 0.04);
        this.viewMatrices[1].compose(this.position, this.quaternion, this.scale);
        this.viewMatrixInverses[1].getInverse(this.viewMatrices[1]);

        this._translateOnAxis(this.position, this.matrix, axises.x, -0.02);
      } else {
        for (let i = 0; i < 2; i++) {
          this.viewMatrices[i].copy(this.matrix);
          this.viewMatrixInverses[i].copy(this.matrixInverse);
        }
      }
    }
  }

  class HeadsetPoseUpdateEvent extends Event {
    constructor(type, viewMatrices, viewMatrixInverses) {
      super(type);

      this.viewMatrices = [];
      this.viewMatrixInverses = [];

      for (let i = 0; i < viewMatrices.length; i++) {
        viewMatrices[i].toArray(this.viewMatrices, i * 16);
        viewMatrixInverses[i].toArray(this.viewMatrixInverses, i * 16);
      }
    }
  }

  class HeadsetProjectionMatricesUpdateEvent extends Event {
    constructor(type, projectionMatrices) {
      super(type);

      this.projectionMatrices = [];

      for (let i = 0; i < projectionMatrices.length; i++) {
        projectionMatrices[i].toArray(this.projectionMatrices, i * 16);
      }
    }
  }

  class HeadsetViewportsUpdateEvent extends Event {
    constructor(type, viewports) {
      super(type);

      this.viewports = [];

      for (let i = 0; i < viewports.length; i++) {
        viewports[i].toArray(this.viewports, i * 4);
      }
    }
  }

  return Headset;
}
