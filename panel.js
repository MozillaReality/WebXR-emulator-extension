const port = chrome.runtime.connect(null, {name: 'panel'});
const tabId = chrome.devtools.inspectedWindow.tabId;

// receive message from contentScript via background

port.onMessage.addListener(message => {
  if (message.action === 'webxr-startup') {
    if (assetNodes.headset) {
      notifyPoseChange('headset', assetNodes.headset);
    }
    if (assetNodes.rightHand) {
      notifyPoseChange('rightHand', assetNodes.rightHand);
    }
    if (assetNodes.leftHand) {
      notifyPoseChange('leftHand', assetNodes.leftHand);
    }
  }
});

// send messag to contentScript via background

const postMessage = (message) => {
  message.tabId = tabId;
  port.postMessage(message);
};

const notifyPoseChange = (objectName, node) => {
  postMessage({
    action: 'webxr-pose',
    object: objectName,
    position: node.position.toArray([]),
    quaternion: node.quaternion.toArray([])
  });
};

const notifyButtonPressed = (objectName, pressed) => {
  postMessage({
    action: 'webxr-button',
    object: objectName,
    pressed: pressed
  });
};

//

const states = {
  translateMode: true,
  rightButtonPressed: false,
  leftButtonPressed: false
};

const deviceCapabilities = {
  headset: {
    hasPosition: false,
    hasRotation: false
  },
  controller: {
    hasPosition: false,
    hasRotation: false
  }
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

const disableTransformControlsIfNeeded = (controls, capability) => {
  if (!controls.enabled) {
    return;
  }

  if (states.translateMode && !capability.hasPosition) {
    controls.enabled = false;
  } else if (!states.translateMode && !capability.hasRotation) {
    controls.enabled = false;
  }
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
      notifyPoseChange('headset', parent);
    };

    const controls = createTransformControls(parent, onChange,
      document.getElementById('headsetCheckbox').checked);
    disableTransformControlsIfNeeded(controls, deviceCapabilities.headset);

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
       notifyPoseChange('rightHand', parentRight); 
      };

      const controls = createTransformControls(parentRight, onChange,
        document.getElementById('rightHandCheckbox').checked);
      disableTransformControlsIfNeeded(controls, deviceCapabilities.controller);

      scene.add(controls);
      transformControls.rightHand = controls;
      onChange();
    }

    if (loadLeft) {
      scene.add(parentLeft);
      assetNodes.leftHand = parentLeft;

      const onChange = () => {
        notifyPoseChange('leftHand', parentLeft);
      };

      const controls = createTransformControls(parentLeft, onChange,
        document.getElementById('leftHandCheckbox').checked);
      disableTransformControlsIfNeeded(controls, deviceCapabilities.controller);

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

    controls.detach(parent);

    assetNodes[key] = null;
    transformControls[key] = null;
  }

  deviceCapabilities.headset.hasPosition = false;
  deviceCapabilities.headset.hasRotation = false;
  deviceCapabilities.controller.hasPosition = false;
  deviceCapabilities.controller.hasRotation = false;

  // @TODO: Get information from device profile file or somewhere?
  if (deviceIndex === 1) { // Oculus Go
    loadHeadsetAsset();
    loadControllersAsset(true, false);
    deviceCapabilities.headset.hasPosition = false;
    deviceCapabilities.headset.hasRotation = true;
    deviceCapabilities.controller.hasPosition = false;
    deviceCapabilities.controller.hasRotation = true;
  } else if (deviceIndex === 2) { // Oculus Quest
    loadHeadsetAsset();
    loadControllersAsset(true, true);
    deviceCapabilities.headset.hasPosition = true;
    deviceCapabilities.headset.hasRotation = true;
    deviceCapabilities.controller.hasPosition = true;
    deviceCapabilities.controller.hasRotation = true;
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
  const checked = domElement.checked;
  controls.visible = checked;
  controls.enabled = checked;
}

const onHeadsetCheckboxChange = () => {
  const controls = transformControls.headset;

  if (!controls) {
    return;
  }

  const checkbox = document.getElementById('headsetCheckbox');
  updateControlsEnability(checkbox, controls);
  disableTransformControlsIfNeeded(controls, deviceCapabilities.headset);
  render();
};

document.getElementById('headsetCheckbox')
  .addEventListener('change', onHeadsetCheckboxChange, false);

document.getElementById('headsetSpan').addEventListener('click', event => {
  const checkbox = document.getElementById('headsetCheckbox');
  checkbox.checked = !checkbox.checked;
  onHeadsetCheckboxChange();
});

const onRightHandCheckboxChange = () => {
  const controls = transformControls.rightHand;

  if (!controls) {
    return;
  }

  const checkbox = document.getElementById('rightHandCheckbox');
  updateControlsEnability(checkbox, controls);
  disableTransformControlsIfNeeded(controls, deviceCapabilities.controller);
  render();
};

document.getElementById('rightHandCheckbox')
  .addEventListener('change', onRightHandCheckboxChange, false);

document.getElementById('rightHandSpan').addEventListener('click', event => {
  const checkbox = document.getElementById('rightHandCheckbox');
  checkbox.checked = !checkbox.checked;
  onRightHandCheckboxChange();
}, false);

const onLeftHandCheckboxChange = () => {
  const controls = transformControls.leftHand;

  if (!controls) {
    return;
  }

  const checkbox = document.getElementById('leftHandCheckbox');
  updateControlsEnability(checkbox, controls);
  disableTransformControlsIfNeeded(controls, deviceCapabilities.controller);
  render();
};

document.getElementById('leftHandCheckbox')
  .addEventListener('change', onLeftHandCheckboxChange, false);

document.getElementById('leftHandSpan').addEventListener('click', event => {
  const checkbox = document.getElementById('leftHandCheckbox');
  checkbox.checked = !checkbox.checked;
  onLeftHandCheckboxChange();
}, false);

document.getElementById('translateButton').addEventListener('click', event => {
  states.translateMode = !states.translateMode;

  for (let key in transformControls) {
    const controls = transformControls[key];

    if (!controls) {
      continue;
    }
 
    controls.setMode(states.translateMode ? 'translate' : 'rotate');
    updateControlsEnability(document.getElementById(key + 'Checkbox'), controls);
    disableTransformControlsIfNeeded(controls,
      key === 'headset' ? deviceCapabilities.headset : deviceCapabilities.controller);
  }

  render();
}, false);

document.getElementById('rightPressButton').addEventListener('click', event => {
  states.rightButtonPressed = !states.rightButtonPressed;
  notifyButtonPressed('rightHand', states.rightButtonPressed);
}, false);

document.getElementById('leftPressButton').addEventListener('click', event => {
  states.leftButtonPressed = !states.leftButtonPressed;
  notifyButtonPressed('leftHand', states.leftButtonPressed);
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
const initialValues = [1, 0]; // @TODO: Import from Configuration

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
