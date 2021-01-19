// For Hand Controller.
// Capture web camera and track hands with
// MediaPipe https://github.com/google/mediapipe

const MEDIA_PIPE_FPS = 15;

class MediaPipeHelper {
  constructor() {
    this.hands = new Hands({locateFile: file => {
      return `src/extension/node_modules/@mediapipe/hands/${file}`;
    }});

    this.hands.setOptions({
      maxNumHands: 2,
      minDetectionConfidence: 0.5, // @TODO: Properer number
      minTrackingConfidence: 0.5 // @TODO: Properer number
    });

    this.callbacks = [];

    this.hands.onResults(results => {
      const poses = {};

      if (results.multiHandLandmarks) {
        const multiHandedness = results.multiHandedness;
        const multiLandmarks = results.multiHandLandmarks;

        const leftRight = {
          Left: {landmarks: null, score: -1},
          Right: {landmarks: null, score: -1}
        };

        for (const handedness of multiHandedness) {
          // Workaround @TODO: Write comment
          if (handedness.index === 1 && multiLandmarks.length === 1) {
            handedness.index = 0;
          }

          if (!multiLandmarks[handedness.index] || !leftRight[handedness.label]) {
            continue;
          }

          const side = leftRight[handedness.label];
          if (!side.landmarks || handedness.score > side.score) {
            side.landmarks = multiLandmarks[handedness.index];
            side.score = handedness.score;
          }
        }

        if (leftRight.Left.landmarks) {
          poses.left = this.pack(this.convertLandmarksToWebXR(leftRight.Left.landmarks));
        }
        if (leftRight.Right.landmarks) {
          poses.right = this.pack(this.convertLandmarksToWebXR(leftRight.Right.landmarks));
        }
      }

      for (const callback of this.callbacks) {
        callback(poses, results);
      }
    });
  }

  // Convert from Media Pipe hand landmarks to WebXR Hand input landmarks
  // https://google.github.io/mediapipe/solutions/hands#hand-landmark-model
  // https://www.w3.org/TR/webxr-hand-input-1/#skeleton-joints-section
  convertLandmarksToWebXR(landmarks) {
    const result = [];
    result[0] = landmarks[0];
    result[1] = landmarks[1];
    result[2] = landmarks[2];
    result[3] = landmarks[3];
    result[4] = landmarks[4];
    result[5] = this.makeUpMissingLandmark(landmarks[0], landmarks[5]);
    result[6] = landmarks[5];
    result[7] = landmarks[6];
    result[8] = landmarks[7];
    result[9] = landmarks[8];
    result[10] = this.makeUpMissingLandmark(landmarks[0], landmarks[9]);
    result[11] = landmarks[9];
    result[12] = landmarks[10];
    result[13] = landmarks[11];
    result[14] = landmarks[12];
    result[15] = this.makeUpMissingLandmark(landmarks[0], landmarks[13]);
    result[16] = landmarks[13];
    result[17] = landmarks[14];
    result[18] = landmarks[15];
    result[19] = landmarks[16];
    result[20] = this.makeUpMissingLandmark(landmarks[0], landmarks[17]);
    result[21] = landmarks[17];
    result[22] = landmarks[18];
    result[23] = landmarks[19];
    result[24] = landmarks[20];

    // @TODO: Write Comment
    for (let i = 0; i < result.length; i++) {
	  result[i] = Object.assign({}, {
		x: (result[i].x - 0.5) * 0.5,
        y: (0.5 - result[i].y) * 0.5,
        z: -0.3
      });
    }

    return result;
  }

  // Making up a missing landmarks for WebXR Hand input
  // from the nearest two landmarks.
  // Calculating just the middle of them for now.
  makeUpMissingLandmark(landmark0, landmark1) {
    return {
      x: (landmark0.x + landmark1.x) / 2,
      y: (landmark0.y + landmark1.y) / 2
    };
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
    return this.hands.send({image: videoElement});
  }

  addOnFrameListener(callback) {
    this.callbacks.push(callback);
  }
}

class WebCamHelper {
  constructor() {
    this.video = document.createElement('video');
    this.callbacks = [];
  }

  addOnFrameListener(callback) {
    this.callbacks.push(callback);
  }

  async init() {
    return new Promise(async resolve => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({video: true});
      } catch (error) {
        console.error(error);
        resolve(false);
        return;
      }

      // @TODO: Do only if necessary
      stream = await new VideoStreamFlipper().getFlip(stream);

      if (!stream) {
        resolve(false);
        return;
      }

      this.video.addEventListener('loadedmetadata', _ => {
        this.video.play();
      });
      this.video.addEventListener('play', _ => {
        resolve(true);
      });
      this.video.addEventListener('error', error => {
        console.error(error);
        resolve(false);
      });
      this.video.srcObject = stream;
    });
  }

  async requestConnection() {
    if (!(await this.init())) {
      return false;
    }
    this.onFrame();
    return true;
  }

  onFrame() {
    const startTime = performance.now();
    const pending = [];
    for (const callback of this.callbacks) {
      pending.push(callback(this.video));
    }
    Promise.all(pending).then(() => {
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;
      // @TODO: Properer timeout timing.
      setTimeout(this.onFrame.bind(this), Math.max(1000 / MEDIA_PIPE_FPS - elapsedTime, 0));
    });
  }
}

class VideoStreamFlipper {
  constructor() {
  }

  async getFlip(stream) {
    const settings = stream.getVideoTracks()[0].getSettings();
    const canvas = document.createElement('canvas');
    canvas.width = settings.width;
    canvas.height = settings.height;
    const context = canvas.getContext('2d');
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    const video = document.createElement('video');
    let previousTime = null;
    const onFrame = _ => {
      const currentTime = performance.now();
      const elapsedTime = currentTime - previousTime;
      previousTime = currentTime;
      setTimeout(onFrame, Math.max(1000 / settings.frameRate - elapsedTime, 0));
      context.drawImage(video, 0, 0);
    };
    return new Promise(resolve => {
      video.addEventListener('loadedmetadata', _ => {
        video.play();
      });
      video.addEventListener('play', _ => {
        previousTime = performance.now();
        onFrame();
        resolve(canvas.captureStream(settings.frameRate));
      });
      video.addEventListener('error', error => {
        console.error(error);
        resolve(null);
      });
      video.srcObject = stream;
    });
  }
}

class MediaPipeDebugHelper {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.video = document.createElement('video');
  }

  async init() {
    return new Promise(resolve => {
      this.video.addEventListener('loadedmetadata', _ => {
        this.video.play();
      });
      this.video.addEventListener('play', _ => {
        this.video.requestPictureInPicture();
      });
      this.video.addEventListener('enterpictureinpicture', event => {
        const pipWindow = event.pictureInPictureWindow;
        resolve(true);
      });
      this.video.addEventListener('error', error => {
        console.error(error);
        resolve(false);
      });
      this.video.srcObject = this.canvas.captureStream(MEDIA_PIPE_FPS);
    });
  }

  update(results) {
    if (this.canvas.width !== results.image.width ||
      this.canvas.height !== results.image.height) {
      this.canvas.width = results.image.width;
      this.canvas.height = results.image.height;
    }
    this.context.drawImage(results.image, 0, 0);

    if (!results.multiHandLandmarks) { return; }

    const multiHandedness = results.multiHandedness;
    const multiLandmarks = results.multiHandLandmarks;

    for (const handedness of multiHandedness) {
      const landmarks = multiLandmarks[handedness.index];
      if (!landmarks) { continue; }

      for (const landmark of landmarks) {
        const x = landmark.x * results.image.width;
        const y = landmark.y * results.image.height;
        this.context.beginPath();
        this.context.arc(x, y, 6, 0, 360 * Math.PI / 180);
        this.context.fillStyle = 'yellow';
        this.context.fill();
        this.context.lineWidth = 2;
        this.context.strokeStyle = 'red';
        this.context.stroke();
      }

      this.context.beginPath();
      const beginX = landmarks[0].x * results.image.width;
      const beginY = landmarks[0].y * results.image.height;
      for (let i = 0; i < 5; i++) {
        this.context.moveTo(beginX, beginY);
        for (let j = 0; j < 4; j++) {
          const landmark = landmarks[i * 4 + j + 1];
          const x = landmark.x * results.image.width;
          const y = landmark.y * results.image.height;
          this.context.lineTo(x, y);
        }
      }
      this.context.lineWidth = 5;
      this.context.strokeStyle = 'red';
      this.context.stroke();
    }
  }
}
