function HeadsetInjection() {
  'use strict';

  const tmpVector3 = new _Math.Vector3();
  const tmpMatrix3 = new _Math.Matrix3();

  const projectionMatrix = new _Math.Matrix4();

  const axises = {
    x: new _Math.Vector3(1, 0, 0),
    y: new _Math.Vector3(0, 1, 0),
    z: new _Math.Vector3(0, 0, 1)
  };

  class Headset {
    constructor(device, hasPosition, hasRotation) {
      this.device = device;
      this.hasPosition = hasPosition;
      this.hasRotation = hasRotation;
      this.stereoEnabled = true;

      this._position = new _Math.Vector3();
      this._rotation = new _Math.Euler();
      this._quaternion = new _Math.Quaternion();
      this._scale = new _Math.Vector3(1, 1, 1);
      this._matrix = new _Math.Matrix4();
      this._matrixInverse = new _Math.Matrix4();

      this.device.addEventListener('sessionupdate', event => {
        this._updateViewport();
        this._updateProjectionMatrices();
        this.updatePose(this._position.toArray([]), this._quaternion.toArray([]));
      });

      this._updateViewport();
      this._updateProjectionMatrices();
    }

    enableStereo(enable) {
      this.stereoEnabled = enable;
    }

    updatePose(positionArray, quaternionArray) {
      const position = this._position.fromArray(positionArray);
      const quaternion = this._quaternion.fromArray(quaternionArray);
      const session = this.device.session;
      const scale = this._scale;
      const matrix = this._matrix;
      const matrixInverse = this._matrixInverse;

      if (session) {
        // for left eye

        if (this.stereoEnabled) {
          this._translateOnAxis(axises.x, -0.02);
        }

        matrix.compose(position, quaternion, scale);
        matrixInverse.getInverse(matrix);

        matrix.toArray(session._frame._viewerPose.views[0].transform.matrix);
        matrixInverse.toArray(session._frame._viewerPose.views[0].transform.inverse.matrix);

        // for right eye

        if (this.stereoEnabled) {
          this._translateOnAxis(axises.x, 0.04);
        }

        matrix.compose(position, quaternion, scale);
        matrixInverse.getInverse(matrix);

        matrix.toArray(session._frame._viewerPose.views[1].transform.matrix);
        matrixInverse.toArray(session._frame._viewerPose.views[1].transform.inverse.matrix);

        // reset position

        if (this.stereoEnabled) {
          this._translateOnAxis(axises.x, -0.02);
        }
      }

      matrix.compose(position, quaternion, scale);
      matrixInverse.getInverse(matrix);
    }

    _updateProjectionMatrices() {
      const session = this.device.session;

      if (!session || !session.renderState) {
        return;
      }

      const renderState = session.renderState;
      const depthNear = renderState.depthNear;
      const depthFar = renderState.depthFar;
      const inlineVerticalFieldOfView = renderState.inlineVerticalFieldOfView;
      const aspect = window.innerWidth / window.innerHeight * (this.stereoEnabled ? 0.5 : 1.0);

      for (let i = 0; i < 2; i++) {
        const view = session._frame._viewerPose.views[i];
        const fov = inlineVerticalFieldOfView * 180 / Math.PI
        this._updateProjectionMatrix(fov, aspect, depthNear, depthFar, view.projectionMatrix);
      }
    }

    _updateProjectionMatrix(fov, aspect, near, far, array) {
      const zoom = 1;
      const top = near * Math.tan(Math.PI / 180 * 0.5 * fov) / zoom;
      const height = 2 * top;
      const width = aspect * height;
      const left = -0.5 * width;

      projectionMatrix.makePerspective(left, left + width, top, top - height, near, far);
      projectionMatrix.toArray(array);
    }

    _updateViewport() {
      const session = this.device.session;

      if (!session ||
          !session.renderState ||
          !session.renderState.baseLayer ||
          !session.renderState.baseLayer._viewports) {
        return;
      }

      const viewports = session.renderState.baseLayer._viewports;
      for (let i = 0; i < 2; i++) {
        // @TODO: Use XREye.left/right?
        const viewport = viewports[i];

        if (this.stereoEnabled) {
          viewport.x = i === 0 ? 0 : window.innerWidth / 2 * window.devicePixelRatio;
          viewport.width = window.innerWidth / 2 * window.devicePixelRatio;
        } else {
          viewport.x = i === 0 ? 0 : window.innerWidth * window.devicePixelRatio;
          viewport.width = i === 0 ? window.innerWidth * window.devicePixelRatio : 0;
        }

        viewport.y = 0;
        viewport.height = window.innerHeight * window.devicePixelRatio;
      }
    }

    _translateOnAxis(axis, distance) {
      tmpVector3.copy(axis).applyMatrix3(tmpMatrix3.setFromMatrix4(this._matrix));
      this._position.x += tmpVector3.x * distance;
      this._position.y += tmpVector3.y * distance;
      this._position.z += tmpVector3.z * distance;
    }
  }

  return Headset;
}
