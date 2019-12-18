import {
  BoxBufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  GridHelper,
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
  Vector2
} from 'three';

// @TODO: These default values should be imported from somewhere common place
const DEFAULT_CAMERA_POSITION = [0, 1.6, 0];
const DEFAULT_TABLET_POSITION = [0, 1.6, -0.1];
const DEFAULT_POINTER_POSITION = [0, 1.6, -0.08];

const dummyCanvasTexture = new CanvasTexture(document.createElement('canvas'));

export default class ARScene {
  constructor(deviceSize) {
    this.renderer = null;
    this.camera = null;
    this.tablet = null;
    this.pointer = null;
    this.screen = null;

    // for mouse click on the tablet screen
    this.isTouched = false;
    this.onTouch = null; // callback fired when mouse clicks the screen
    this.onRelease = null; // callback fired when screen touch is released

    this._init(deviceSize);
  }

  _init(deviceSize) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const canvas = document.createElement('canvas');
    // WebXR app Canvas size can't be power of two size. So using WebGL2.
    // @TODO: Error message for non WebGL2 support browser?
    const context = canvas.getContext('webgl2', {antialias: true});

    const renderer = new WebGLRenderer({canvas: canvas, context: context});
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

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

    const gridHelper = new GridHelper(20, 20, 0xffffff, 0xdddddd);
    scene.add(gridHelper);

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
    pointer.position.fromArray(DEFAULT_POINTER_POSITION);
    scene.add(pointer);

    // Raycasting for firing input event by clicking the tablet

    const raycaster = new Raycaster();
    const mouse = new Vector2();
    const targetObjects = [screen, tablet];

    // @TODO: Rename to better name?
    const getTouchedPointWithScreen = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      // left-top (0, 0), right-bottom (1, 1)
      const point = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height
      };
      mouse.set(point.x * 2 - 1, -(point.y * 2) + 1);
      raycaster.setFromCamera(mouse, camera);
      const intersectedObjects = raycaster.intersectObjects(targetObjects);      
      return (intersectedObjects.length > 0 && intersectedObjects[0].object === screen)
        ? intersectedObjects[0] : null;
    };

    renderer.domElement.addEventListener('mousemove', event => {
      event.preventDefault();
      if (!this.isTouched) {
        return;
      }
      const result = getTouchedPointWithScreen(event);
      if (!result) {
        this.isTouched = false;
        if (this.onRelease) {
          this.onRelease();
        }
        return;
      }
      if (this.onTouch) {
        this.onTouch(result.point.toArray());
      }
    }, false);

    renderer.domElement.addEventListener('mousedown', event => {
      event.preventDefault();
      if (this.isTouched) {
        return;
      }
      const result = getTouchedPointWithScreen(event);
      if (result) {
        this.isTouched = true;
        if (this.onTouch) {
          this.onTouch(result.point.toArray());
        }
      }
    }, false);

    renderer.domElement.addEventListener('mouseup', event => {
      event.preventDefault();
      if (!this.isTouched) {
        return;
      }
      this.isTouched = false;
      if (this.onRelease) {
        this.onRelease();
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
    this.camera = camera;
    this.screen = screen;
    this.tablet = tablet;
    this.pointer = pointer;
  }

  inject() {
    const appendCanvas = () => {
      const element = this.renderer.domElement;
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.zIndex = '9999'; // To override window overall
      document.body.appendChild(element);
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
  }

  released() {
    this.pointer.material.color.setHex(0xff8888);
  }
}
