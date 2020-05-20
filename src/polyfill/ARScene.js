import {
  BoxBufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  WebGLRenderer,
  WebGLRenderTarget,
  PerspectiveCamera,
  PlaneBufferGeometry,
  Raycaster,
  Scene,
  SphereBufferGeometry,
  Vector2,
  Vector3
} from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import MyControls from './MyControls.js';

// @TODO: These default values should be imported from somewhere common place
const DEFAULT_CAMERA_POSITION = [0, 1.6, 0];
const DEFAULT_TABLET_POSITION = [0, 1.6, -0.2];
const DEFAULT_POINTER_POSITION = [0, 1.6, -0.15];

const dummyCanvasTexture = new CanvasTexture(document.createElement('canvas'));
const raycaster = new Raycaster();

export default class ARScene {
  constructor(deviceSize) {
    this.renderer = null;
    this.camera = null;
    this.tablet = null;
    this.pointer = null;
    this.screen = null;

    // for mouse click on the tablet screen
    this.isTouched = false;
    this.onCameraPoseUpdate = null;
    this.onTabletPoseUpdate = null;
    this.onTouch = null; // callback fired when mouse clicks the tablet screen
    this.onRelease = null; // callback fired when the tablet screen touch is released

    this._init(deviceSize);
  }

  _init(deviceSize) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const canvas = document.createElement('canvas');
    // WebXR app Canvas size may not be power of two. So using WebGL2.
    // @TODO: Error message for non WebGL2 support browser?
    const context = canvas.getContext('webgl2', {antialias: true});

    const renderer = new WebGLRenderer({canvas: canvas, context: context});
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.oncontextmenu = () => { return false; };

    // Using 1024 without any special reasons so far
    const renderTarget = new WebGLRenderTarget(1024, 1024);

    const scene = new Scene();
    scene.background = new Color(0x444444);

    const camera = new PerspectiveCamera(90, width / height, 0.001, 1000.0);
    camera.position.fromArray(DEFAULT_CAMERA_POSITION);

    // @TODO: near and far should be from renderState
    // @TODO: Proper fov
    const tabletCamera = new PerspectiveCamera(90, deviceSize.width / deviceSize.height, 0.1, 1000.0);

    const light = new DirectionalLight(0xffffff, 4.0);
    light.position.set(-1, 1, -1);
    scene.add(light);

    const outsideFrameWidth = 0.005;
    const screen = new Mesh(
      new PlaneBufferGeometry(deviceSize.width - outsideFrameWidth, deviceSize.height - outsideFrameWidth),
      new MeshBasicMaterial({color: 0xffffff, map: renderTarget.texture})
    );
    screen.position.z = deviceSize.depth * 0.5 + 0.0001;  // 0.0001 is for not hiding the screen by the device
    screen.material.userData.map2 = {value: {needsUpdate: true}}; // Dummy. Updated in onBeforeCompile()
    screen.add(tabletCamera);

    // Edit shader to mix WebXR app Canvas and ARScene renderTarget.
    // @TODO: Is there any easier way?
    screen.material.onBeforeCompile = shader => {
      // Uniform for WebXR app Canvas.
      // @TODO: Rename map2 to better name.
      shader.uniforms.map2 = {
        // Set dummy so far and replace with the right one latter.
        value: dummyCanvasTexture
      };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <map_pars_fragment>\n',
          '#include <map_pars_fragment>\n' +
          'uniform sampler2D map2;\n'
        ).replace(
          '#include <map_fragment>\n',
          // For the simplicity of shader, assuming both map and map2 aren't null
          'vec4 texelColor = mapTexelToLinear(texture2D(map, vUv));\n' +
          'vec4 texelColor2 = mapTexelToLinear(texture2D(map2, vUv));\n' +
          // @TODO: Mix more properly if possible?
          'diffuseColor *= vec4(texelColor.rgb * (1.0 - texelColor2.a) + texelColor2.rgb * texelColor2.a, texelColor.a);\n'
        );
      screen.material.userData.map2 = shader.uniforms.map2;
      //console.log(shader);
    };

    const tablet = new Mesh(
      new BoxBufferGeometry(deviceSize.width, deviceSize.height, deviceSize.depth),
      new MeshStandardMaterial({color: 0x000000})
    );
    tablet.position.fromArray(DEFAULT_TABLET_POSITION);
    tablet.add(screen);
    scene.add(tablet);

    const pointer = new Mesh(
      new SphereBufferGeometry(0.01),
      new MeshBasicMaterial({color: 0xff8888, transparent: true, opacity: 0.6})
    );
    pointer.visible = false;
    pointer.position.fromArray(DEFAULT_POINTER_POSITION);
    scene.add(pointer);

    // Controls

    const cameraControls = new MyControls(camera, renderer.domElement);
    cameraControls.addEventListener('change', () => {
      if (this.onCameraPoseUpdate) {
        this.onCameraPoseUpdate(camera.position.toArray(), camera.quaternion.toArray());
      }
    });

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode('translate');
    transformControls.attach(tablet);
    transformControls.addEventListener('change', () => {
      if (this.onTabletPoseUpdate) {
        this.onTabletPoseUpdate(tablet.position.toArray(), tablet.quaternion.toArray());
      }
    });
    transformControls.addEventListener('mouseDown', () => {
      cameraControls.enabled = false;
    });
    transformControls.addEventListener('mouseUp', () => {
      cameraControls.enabled = true;
    });
    scene.add(transformControls);

    // Raycasting for
    //   - switching transform operation mode by left clicking
    //   - firing input event by right clicking the tablet

    const mouse = new Vector2();
    const targetObjects = [screen, tablet];

    let mouseDownTime = null;
    const transformModes = {
      disabled: 0,
      translate: 1,
      rotate: 2
    };
    let transformMode = transformModes.translate;

    const raycast = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      // left-top (0, 0), right-bottom (1, 1)
      const point = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height
      };
      mouse.set(point.x * 2 - 1, -(point.y * 2) + 1);
      raycaster.setFromCamera(mouse, camera);
      return raycaster.intersectObjects(targetObjects);
    };

    renderer.domElement.addEventListener('mousedown', event => {
      if (event.button === 0) {
        // left click for translate operation mode
        if (raycast(event).length > 0) {
          mouseDownTime = performance.now();
        }
      } else if (event.button === 2) {
        // right click for input event 
        if (this.isTouched) {
          return;
        }
        const results = raycast(event);
        if (results.length > 0 && results[0].object === screen) {
          this.isTouched = true;
          cameraControls.enabled = false;
          if (this.onTouch) {
            this.onTouch(results[0].point.toArray());
          }
        }
      }
      event.preventDefault();
    }, false);

    renderer.domElement.addEventListener('mouseup', event => {
      if (event.button === 0) {
        // left click for translate operation mode
        if (mouseDownTime === null) {
          return;
        }
        const mouseUpTime = performance.now();
        const thresholdTime = 300;
        if (mouseUpTime - mouseDownTime > thresholdTime) {
          return;
        }
        transformMode = transformMode === transformModes.disabled ? transformModes.translate :
                        transformMode === transformModes.translate ? transformModes.rotate :
                        transformModes.disabled;
        switch (transformMode) {
          case transformModes.disabled:
            transformControls.visible = false;
            transformControls.enabled = false;
            break;
          case transformModes.translate:
            transformControls.visible = true;
            transformControls.enabled = true;
            transformControls.setMode('translate');
            break;
          case transformModes.rotate:
            transformControls.visible = true; // just in case
            transformControls.enabled = true; // just in case
            transformControls.setMode('rotate');
            break;
        }
      } else if (event.button === 2) {
        // right click for input event
        cameraControls.enabled = true;
        if (!this.isTouched) {
          return;
        }
        this.isTouched = false;
        if (this.onRelease) {
          this.onRelease();
        }
      }
      event.preventDefault();
    }, false);

    renderer.domElement.addEventListener('mousemove', event => {
      event.preventDefault();
      if (!this.isTouched) {
        return;
      }
      const results = raycast(event);
      if (results.length === 0 || results[0].object !== screen) {
        this.isTouched = false;
        if (this.onRelease) {
          this.onRelease();
        }
        return;
      }
      if (this.onTouch) {
        this.onTouch(results[0].point.toArray());
      }
    }, false);

    // animation frame

    const animate = () => {
      requestAnimationFrame(animate);

      // First pass. Rendering ARScene to renderTarget.

      screen.visible = false;
      scene.traverse(object => {
        if (object.userData.virtual) {
          object.visible = true;
        }
      });
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, tabletCamera);

      // Second pass. Rendering ARScene and screen.
      // renderTarget and WebXR app Canvas is mixed on screen.

      cameraControls.update();
      // @TODO: If possible, update the canvas texture only when the canvas is updated
      screen.material.userData.map2.value.needsUpdate = true;
      screen.visible = true;
      scene.traverse(object => {
        if (object.userData.virtual) {
          object.visible = false;
        }
      });
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    };

    animate();

    //

    window.addEventListener('resize', event => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }, false);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.screen = screen;
    this.tablet = tablet;
    this.pointer = pointer;
    this.tabletCamera = tabletCamera;
    this.room = null;
  }

  inject(div) {
    const appendCanvas = () => {
      div.appendChild(this.renderer.domElement);
    };

    if (document.body) {
      appendCanvas();
    } else {
      document.addEventListener('DOMContentLoaded', appendCanvas);
    }
  }

  eject() {
    const element = this.renderer.domElement;
    element.parentElement.removeChild(element);
  }

  setCanvas(canvas) {
    this.screen.material.userData.map2.value = new CanvasTexture(canvas);
  }

  releaseCanvas() {
    this.screen.material.userData.map2.value = dummyCanvasTexture;
  }

  // Raycasting for AR hit testing API
  getHitTestResults(origin, direction) {
    raycaster.set(new Vector3().fromArray(origin), new Vector3().fromArray(direction));
    const targets = [];
    if (this.room) {
      targets.push(this.room);
    }
    return raycaster.intersectObjects(targets, true);
  }

  loadVirtualRoomAsset(buffer) {
    new GLTFLoader().parse(buffer, '', gltf => {
      this.scene.add(gltf.scene);
      this.room = gltf.scene;
    }, undefined, error => {
      console.error(error);
    });
  }

  updateCameraTransform(positionArray, quaternionArray) {
    this.camera.position.fromArray(positionArray);
    this.camera.quaternion.fromArray(quaternionArray);
  }

  updateTabletTransform(positionArray, quaternionArray) {
    this.tablet.position.fromArray(positionArray);
    this.tablet.quaternion.fromArray(quaternionArray);
  }

  updatePointerTransform(positionArray, quaternionArray) {
    this.pointer.position.fromArray(positionArray);
    this.pointer.quaternion.fromArray(quaternionArray);
  }

  touched() {
    this.pointer.material.color.setHex(0x8888ff);
    this.pointer.visible = true;
  }

  released() {
    this.pointer.material.color.setHex(0xff8888);
    this.pointer.visible = false;
  }
}
