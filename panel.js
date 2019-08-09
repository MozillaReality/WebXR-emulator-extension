const port = chrome.runtime.connect(null, {name: 'panel'});

// receive message from contentScript via background

port.onMessage.addListener(message => {
  console.log(message);
  if (message.action === 'webxr-startup') {
    if (assetNodes.headset) {
      onPoseChange('headset', assetNodes.headset);
    }
    if (assetNodes.rightHand) {
      onPoseChange('rightHand', assetNodes.rightHand);
    }
    if (assetNodes.leftHand) {
      onPoseChange('leftHand', assetNodes.leftHand);
    }
  }
});

const onPoseChange = (objectName, node) => {
  port.postMessage({
    action: 'webxr-pose',
    object: objectName,
    position: node.position.toArray([]),
    quaternion: node.quaternion.toArray([])
  });
};

//

const states = {
  translateMode: true,
  rightButtonPressed: false,
  leftButtonPressed: false
};

// initialize Three.js objects

// renderer

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// scene, camera, light, grid

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
camera.lookAt(new THREE.Vector3(0, 2, 0));

const render = () => {
  renderer.render(scene, camera);
};

const light = new THREE.DirectionalLight(0xffffff);
light.position.set(1, 1, 1);
scene.add(light);

const gridHelper = new THREE.PolarGridHelper(10, 5);
scene.add(gridHelper);

// controls

const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
orbitControls.addEventListener('change', render);
orbitControls.target.set(0, 0, 0);

const transformControls = {
  headset: null,
  rightHand: null,
  leftHand: null
};

const createTransformControls = (target, onChange, enabled) => {
  const controls = new THREE.TransformControls(camera, renderer.domElement);
  controls.setMode(states.translateMode ? 'translate' : 'rotate');
  controls.setSpace('local');
  controls.attach(target);

  controls.visible = enabled;
  controls.enabled = enabled;

  controls.addEventListener('mouseDown', () => {
    orbitControls.enabled = false;
  }, false);

  controls.addEventListener('mouseUp', () => {
    orbitControls.enabled = true;
  }, false);

  controls.addEventListener('change', () => {
    onChange();
    render();
  }, false);

  return controls;
};

// assets

const assetNodes = {
  headset: null,
  rightHand: null,
  leftHand: null  
};

const loadHeadsetAsset = () => {
  new THREE.OBJLoader().load('assets/headset.obj', headset => {
    const parent = new THREE.Object3D();
    parent.position.y = 2;
    headset.rotation.y = -Math.PI;

    scene.add(parent.add(headset));
    assetNodes.headset = parent;

    const onChange = () => {
      onPoseChange('headset', parent);
    };

    const controls = createTransformControls(parent, onChange,
      document.getElementById('headsetCheckbox').checked);

    scene.add(controls);
    transformControls.headset = controls;
    onChange();
    render();
  });
};

const loadControllersAsset = (loadRight, loadLeft) => {
  new THREE.GLTFLoader().load('assets/oculus-go-controller.gltf', gltf => {
    const rightController = gltf.scene;
    rightController.scale.multiplyScalar(6);
    const leftController = rightController.clone();

    const parentRight = new THREE.Object3D();
    const parentLeft = new THREE.Object3D();

    parentRight.add(rightController);
    parentRight.position.set(0.5, 1.5, -0.5);

    parentLeft.add(leftController);
    parentLeft.position.set(-0.5, 1.5, -0.5);

    if (loadRight) {
      scene.add(parentRight);
      assetNodes.rightHand = parentRight;

      const onChange = () => {
       onPoseChange('rightHand', parentRight); 
      };

      const controls = createTransformControls(parentRight, onChange,
        document.getElementById('rightHandCheckbox').checked);

      scene.add(controls);
      transformControls.rightHand = controls;
      onChange();
    }

    if (loadLeft) {
      scene.add(parentLeft);
      assetNodes.leftHand = parentLeft;

      const onChange = () => {
        onPoseChange('leftHand', parentLeft);
      };

      const controls = createTransformControls(parentLeft, onChange,
        document.getElementById('leftHandCheckbox').checked);

      scene.add(controls);
      transformControls.leftHand = controls;
      onChange();
    }

    render();
  });
};

const updateAssetNodes = (deviceIndex) => {
  for (let key in assetNodes) {
    const node = assetNodes[key];
    const controls = transformControls[key];

    if (!node) {
      continue;
    }

    if (node.parent) {
      node.parent.remove(node);
    }

    assetNodes[key] = null;

    if (controls) {
      controls.detach(parent);
      transformControls[key] = null;
    }
  }

  if (deviceIndex === 1) { // Oculus Go
    loadHeadsetAsset();
    loadControllersAsset(true, false);
  } else if (deviceIndex === 2) { // Oculus Quest
    loadHeadsetAsset();
    loadControllersAsset(true, true);
  }
};

render();

// event handlers

window.addEventListener('resize', event => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}, false);

const updateControlsEnability = (domElement, controls) => {
  if (!controls) {
    return;
  }

  const checked = domElement.checked;
  controls.visible = checked;
  controls.enabled = checked;
}

document.getElementById('headsetCheckbox').addEventListener('change', event => {
  updateControlsEnability(event.target, transformControls.headset);
}, false);

document.getElementById('rightHandCheckbox').addEventListener('change', event => {
  updateControlsEnability(event.target, transformControls.rightHand);
}, false);

document.getElementById('leftHandCheckbox').addEventListener('change', event => {
  updateControlsEnability(event.target, transformControls.leftHand);
}, false);

document.getElementById('translateButton').addEventListener('click', event => {
  states.translateMode = !states.translateMode;

  for (let key in transformControls) {
    const controls = transformControls[key];

    if (!controls) {
      continue;
    }
 
    controls.setMode(states.translateMode ? 'translate' : 'rotate');
  }

  render();
}, false);

document.getElementById('rightPressButton').addEventListener('click', event => {
  states.rightButtonPressed = !states.rightButtonPressed;
  port.postMessage({
    action: 'webxr-button',
    object: 'rightHand',
    pressed: states.rightButtonPressed
  });
}, false);

document.getElementById('leftPressButton').addEventListener('click', event => {
  states.leftButtonPressed = !states.leftButtonPressed;
  port.postMessage({
    action: 'webxr-button',
    object: 'leftHand',
    pressed: states.leftButtonPressed
  });
}, false);

const deviceSelect = document.getElementById('deviceSelect');
const stereoSelect = document.getElementById('stereoSelect');

const storeValues = () => {
  const storedValue = {};
  storedValue[configurationId] = [
    deviceSelect.selectedIndex,
    stereoSelect.selectedIndex
  ].join(':');
  chrome.storage.local.set(storedValue, () => {
    // window.alert(window); // to check if works
  });
  updateAssetNodes(deviceSelect.selectedIndex);
};

// load configuration and then load assets

const configurationId = 'webxr-extension';
const initialValues = '1:0'.split(':'); // @TODO: Import from Configuration

chrome.storage.local.get(configurationId, result => {
  const values = (result[configurationId] || '').split(':');
  let deviceIndex = parseInt(values[0]);
  let stereoIndex = parseInt(values[1]);

  if (isNaN(deviceIndex)) {
    deviceIndex = initialValues[0];
  }

  if (isNaN(stereoIndex)) {
    stereoIndex = initialValues[1];
  }

  deviceSelect.selectedIndex = deviceIndex;
  stereoSelect.selectedIndex = stereoIndex;

  updateAssetNodes(deviceIndex);
});

deviceSelect.addEventListener('change', storeValues);
stereoSelect.addEventListener('change', storeValues);
