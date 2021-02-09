// For Hand Controller.
// Capture web camera and track hands with
// MediaPipe https://github.com/google/mediapipe

// @TODO: Should this be configurable?
const MEDIA_PIPE_FPS = 15;
const WEBCAM_WIDTH = 1280;
const WEBCAM_HEIGHT = 780;
const WEBCAM_ASPECT = WEBCAM_WIDTH / WEBCAM_HEIGHT;

class MediaPipeHelper {
  /**
   * @param {flip} set true if you want to get horizontally flipped result
   *               for example for selfie camera.
   */
  constructor(flip = false) {
    this.flip = flip;
    this.onResultsCallbacks = [];
    this.hands = null;
  }

  init() {
    this.hands = new Hands({locateFile: file => {
      // Path from the root directory
      return `src/extension/node_modules/@mediapipe/hands/${file}`;
    }});

    this.hands.setOptions({
      maxNumHands: 2, // Any devices whose hands# are non-two?
      minDetectionConfidence: 0.5, // @TODO: Properer number
      minTrackingConfidence: 0.5 // @TODO: Properer number
    });

    this.hands.onResults(results => this.onResults(results));
  }

  addOnFrameListener(callback) {
    this.onResultsCallbacks.push(callback);
  }

  onResults(results) {
    const poses = {};

    if (results.multiHandLandmarks) {
      const multiHandedness = results.multiHandedness;
      const multiHandLandmarks = results.multiHandLandmarks;

      const leftRight = {
        Left: {landmarks: null, score: -1},
        Right: {landmarks: null, score: -1}
      };

      for (const handedness of multiHandedness) {
        // It seems that handedness.index sometimes can be 1 while
        // multiHandLandmarks.length is 1 (MediaPipe bug?).
        // In that case changing the index to 0 as workaround.
        if (handedness.index === 1 && multiHandLandmarks.length === 1) {
          handedness.index = 0;
        }

        if (!multiHandLandmarks[handedness.index] || !leftRight[handedness.label]) {
          continue;
        }

        const side = leftRight[handedness.label];
        // Use the highest scored landmarks for each hand
        if (!side.landmarks || handedness.score > side.score) {
          side.landmarks = multiHandLandmarks[handedness.index];
          side.score = handedness.score;
        }
      }

      if (leftRight.Left.landmarks) {
        poses.left = this.pack(this.convertLandmarksToWebXR(leftRight.Left.landmarks));
      }
      if (leftRight.Right.landmarks) {
        poses.right = this.pack(this.convertLandmarksToWebXR(leftRight.Right.landmarks));
      }

      if (this.flip) {
        this.flipPoses(poses);
      }
    }

    for (const callback of this.onResultsCallbacks) {
      callback(poses, results);
    }
  }

  // Convert from Media Pipe hand landmarks to WebXR Hand input landmarks
  // https://google.github.io/mediapipe/solutions/hands#hand-landmark-model
  // https://www.w3.org/TR/webxr-hand-input-1/#skeleton-joints-section
  convertLandmarksToWebXR(landmarks) {
    const result = [];

    for (let i = 0; i < 5; i++) {
      result[i] = landmarks[i];
    }

    let writeIndex = 5;
    let readIndex = 5;
    for (let i = 0; i < 4; i++) {
      result[writeIndex++] = this.makeUpMissingMetacarpal(landmarks[0], landmarks[readIndex]);
      for (let j = 0; j < 4; j++) {
        result[writeIndex++] = landmarks[readIndex++];
      }
    }

    // Map MediaPipe (image) coordinates to WebXR coordinates
    // x: [0.0, 1.0] -> [-0.25, 0.25] * aspect
    // y: [1.0, 0.0] -> [-0.25, 0.25] (upside down)
    // Currently MediaPipe doesn't detect depth so far so setting arbitary number -0.3 for z.
    // @TODO: Convert more properly
    // @TODO: Emulate depth from the hand size?
    for (let i = 0; i < result.length; i++) {
	  result[i] = Object.assign({}, {
		x: (result[i].x - 0.5) * 0.5 * WEBCAM_ASPECT,
        y: (0.5 - result[i].y) * 0.5,
        z: -0.3
      });
    }

    return result;
  }

  // Easily make up a missing metacarpal landmarks for WebXR Hand input.
  makeUpMissingMetacarpal(wrist, mcp) {
    return {
      x: (wrist.x + mcp.x) / 2,
      y: (wrist.y + mcp.y) / 2
    };
  }

  // Flip poses horizontally
  flipPoses(poses) {
    const tmp = poses.left;
    poses.left = poses.right;
    poses.right = tmp;

    if (poses.right) {
      this.flipPose(poses.right);
    } else {
      delete poses.right;
    }

    if (poses.left) {
      this.flipPose(poses.left);
    } else {
      delete poses.left;
    }
  }

  flipPose(array) {
    for (let i = 0; i < array.length; i += 3) {
      array[i] = -array[i];
    }
  }

  pack(landmarks) {
    const array = [];
    for (const landmark of landmarks) {
      array.push(landmark.x);
      array.push(landmark.y);
      array.push(landmark.z);
    }
    return array;
  }

  send(videoElement) {
    if (!this.hands) {
      return Promise.resolve();
    }
    return this.hands.send({image: videoElement});
  }
}

class VideoPlayer {
  constructor() {
    this.video = document.createElement('video');
  }

  async load(srcObject) {
    return new Promise(resolve => {
      const onLoadedMetadata = () => {
        removeEventListeners();
        resolve(true);
      };
      const onError = error => {
        console.error(error);
        removeEventListeners();
        this.video.srcObject = null;
        resolve(false);
      };
      const removeEventListeners = () => {
        this.video.removeEventListener('loadedmetadata', onLoadedMetadata);
        this.video.removeEventListener('error', onError);
      };
      this.video.addEventListener('loadedmetadata', onLoadedMetadata);
      this.video.addEventListener('error', onError);
      this.video.srcObject = srcObject;
    });
  }

  async play() {
    if (!this.paused) {
      return true;
    }

    return new Promise(resolve => {
      const onPlay = () => {
        removeEventListeners();
        resolve(true);
      };
      const onError = error => {
        console.error(error);
        removeEventListeners();
        resolve(false);
      };
      const removeEventListeners = () => {
        this.video.removeEventListener('play', onPlay);
        this.video.removeEventListener('error', onError);
      };
      this.video.addEventListener('play', onPlay);
      this.video.addEventListener('error', onError);
      this.video.play();
    });
  }

  async pause() {
    if (this.paused) {
      return true;
    }

    return new Promise(resolve => {
      const onPause = () => {
        removeEventListeners();
        resolve(true);
      };
      const onError = error => {
        console.error(error);
        removeEventListeners();
        resolve(false);
      };
      const removeEventListeners = () => {
        this.video.removeEventListener('pause', onPause);
        this.video.removeEventListener('error', onError);
      };
      this.video.addEventListener('pause', onPause);
      this.video.addEventListener('error', onError);
      this.video.pause();
    });
  }

  get initialized() {
    return !!this.video.srcObject;
  }

  get paused() {
    return !this.initialized || this.video.paused;
  }
}

class WebCamHelper extends VideoPlayer {
  constructor() {
    super();
    this.onFrameCallbacks = [];
    this.onPauseCallbacks = [];
    this.timer = new TimeoutHelper();
  }

  addOnFrameListener(callback) {
    this.onFrameCallbacks.push(callback);
  }

  async init() {
    return new Promise(async resolve => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({video: {
          facingMode: 'user',
          width: WEBCAM_WIDTH,
          height: WEBCAM_HEIGHT
        }});
      } catch (error) {
        console.error(error);
        resolve(false);
        return;
      }

      resolve(await super.load(stream));
   });
  }

  async play() {
    if (!this.paused) {
      return true;
    }
    if (!(await super.play())) {
      return false;
    }
    this.onFrame();
    return true;
  }

  onFrame() {
    const pending = [];
    for (const callback of this.onFrameCallbacks) {
      pending.push(callback(this.video));
    }
    Promise.all(pending).then(() => {
      if (this.paused) {
        return;
      }
      this.timer.setTimeout(() => this.onFrame());
    });
  }
}

class MediaPipeDebugHelper extends VideoPlayer {
  constructor(flip = false) {
    super();
    this.flip = flip;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.context = this.canvas.getContext('2d');
    this.lineColor = 'red';
    this.lineWidth = 5;
    this.circleColor = 'yellow';
    this.circleSize = 6;
    this.circleLineWidth = 1;
    this.onLeaveCallbacks = [];
  }

  addOnLeaveListener(callback) {
    this.onLeaveCallbacks.push(callback);
  }

  async init() {
    return new Promise(async resolve => {
      resolve(await super.load(this.canvas.captureStream(MEDIA_PIPE_FPS)));
    });
  }

  async play() {
    if (!await super.play()) {
      return Promise.resolve(false);
    }

    return new Promise(async resolve => {
      const onEnterPictureInPicture = () => {
        removeEventListeners();
        resolve(true);
      };
      const onError = error => {
        console.error(error);
        removeEventListeners();
        resolve(false);
      };
      const removeEventListeners = () => {
        this.video.removeEventListener('enterpictureinpicture', onEnterPictureInPicture);
        this.video.removeEventListener('error', onError);
      };
      this.video.addEventListener('enterpictureinpicture', onEnterPictureInPicture);
      this.video.addEventListener('error', onError);

      const onLeavePictureInPicture = () => {
        super.pause();
        this.video.removeEventListener('leavepictureinpicture', onLeavePictureInPicture);
        for (const callback of this.onLeaveCallbacks) {
          callback();
        }
      };
      this.video.addEventListener('leavepictureinpicture', onLeavePictureInPicture);

      try {
        await this.video.requestPictureInPicture();
      } catch (error) {
        onError(error);
      }
    });
  }

  async pause() {
    if (!await super.pause()) {
      return Promise.resolve(false);
    }

    return new Promise(async resolve => {
      const onLeavePictureInPicture = () => {
        removeEventListeners();
        resolve(true);
      };
      const onError = error => {
        console.error(error);
        removeEventListeners();
        resolve(false);
      };
      const removeEventListeners = () => {
        this.video.removeEventListener('leavepictureinpicture', onLeavePictureInPicture);
        this.video.removeEventListener('error', onError);
      };
      this.video.addEventListener('leavepictureinpicture', onLeavePictureInPicture);
      this.video.addEventListener('error', onError);

      try {
        document.exitPictureInPicture();
      } catch (error) {
        onError(error);
      }
    });
  }

  update(results) {
    const image = results.image;
    const multiHandedness = results.multiHandedness;
    const multiHandLandmarks = results.multiHandLandmarks;

    if (this.canvas.width !== image.width || this.canvas.height !== image.height) {
      this.canvas.width = image.width;
      this.canvas.height = image.height;
      if (this.flip) {
        this.context.setTransform(-1, 0, 0, 1, this.canvas.width, 0);
      }
    }
    this.context.drawImage(image, 0, 0);

    if (!multiHandLandmarks) { return; }

    // Draw landmarks
    for (const handedness of multiHandedness) {
      const landmarks = multiHandLandmarks[handedness.index];

      if (!landmarks) { continue; }

      // Draw circles
      for (const landmark of landmarks) {
        const x = landmark.x * image.width;
        const y = landmark.y * image.height;
        this.context.beginPath();
        this.context.arc(x, y, this.circleSize, 0, 360 * Math.PI / 180);
        this.context.fillStyle = this.circleColor;
        this.context.fill();
        this.context.lineWidth = this.circleLineWidth;
        this.context.strokeStyle = this.lineColor;
        this.context.stroke();
      }

      // Draw lines
      this.context.beginPath();
      const beginX = landmarks[0].x * image.width;
      const beginY = landmarks[0].y * image.height;
      for (let i = 0; i < 5; i++) {
        this.context.moveTo(beginX, beginY);
        for (let j = 0; j < 4; j++) {
          const landmark = landmarks[i * 4 + j + 1];
          const x = landmark.x * image.width;
          const y = landmark.y * image.height;
          this.context.lineTo(x, y);
        }
      }
      this.context.lineWidth = this.lineWidth;
      this.context.strokeStyle = this.lineColor;
      this.context.stroke();
    }
  }
}

class TimeoutHelper {
  constructor() {
    this.previousTime = performance.now();
  }

  setTimeout(callback) {
    const currentTime = performance.now();
    const elapsedTime = currentTime - this.previousTime;
    this.previousTime = currentTime;
    const timeToCall = Math.max(0, 1000 / MEDIA_PIPE_FPS - elapsedTime);
    setTimeout(callback, timeToCall);
  }
}
