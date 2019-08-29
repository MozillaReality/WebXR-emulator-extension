# WebXR emulator extension

WebXR emulator extension is a browser extension which helps your WebXR content creation. It enables to responsively run [WebXR](https://www.w3.org/TR/webxr/) application on your **desktop** browser without the need of any XR devices.

[Blog post](https://blog.mozvr.com/xxxxxx/)

![Screenshot](./screenshots/screenshot.gif)


## Features

- WebXR API polyfill
- Headset and controllers device emulator
- Cross browsers support with [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
<!-- - [Virtual controller (WIP)](./screenshots/virtual-controller.gif) -->


## Status

Currently the development of this extension is in very early stage. Note that the extension

- is tested only on [Three.js WebVR examples](https://threejs.org/examples/?q=webvr#webvr_ballshooter) so far
- is based on [WebXR device API draft issued on May 21 2019](https://www.w3.org/TR/webxr/)
- doesn't fully support entire WebXR API yet
- supports only trigger button, not other buttons
- supports only VR, not AR yet


## Browsers

This extension is built on top of [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions). It works on Firefox, Chrome, and other browsers supporting the API.


## How to use

### Install

Download this project and install the extension into your browser. This extension is in development. I recommend temporary/Developer mode installation. ([Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox), [Chrome](https://developer.chrome.com/extensions/getstarted))

### Usage

Go to WebXR application page (for example, [Three.js examples](https://threejs.org/examples/?q=webvr#webvr_ballshooter)). You will find that you are available to enter immersive(VR) mode.

Open "WebXR" tab in browser's developer tool ([Firefox](https://developer.mozilla.org/en-US/docs/Tools), [Chrome](https://developers.google.com/web/tools/chrome-devtools/)) to controll devices. You can move headset and controller models and trigger the controller buttons with your mouse there. You will see that their transforms are reflected to WebXR application in immersive mode.

## Configuration

You can congifure some settings from the left top in the tab. To reflect the change, you need to reload the application page.

![Configuration](./screenshots/configuration.png)

### Device

You can switch device emulator. Currently the difference is just degrees of freedom and the number of controllers. Not precisely emulated yet.

| Device | Description |
| ---- | ---- |
| Google Cardboard | 3dof headset and no controller |
| HTC Vive | 6dof headset and two 6dof controllers |
| None | No device |
| Oculus Go | 3dof headset and 3dof controller |
| Oculus Quest | 6dof headset and two 6dof controllers |
| Samsung Gear VR | 3dof headset and 3dof controller |

### Stereo Effect

You can enable/disable Stereo Effect which renders two views.

| StereoEffect | Description |
| ---- | ---- |
| Enable | Enables Stereo effect |
| Disable | Disables Stereo effect |


## Kudos

Thanks to [WebVR-Extension project](https://github.com/spite/WebVR-Extension). WebXR emulator extension is very inspired by it.


## License

Mozilla Public License Version 2.0
