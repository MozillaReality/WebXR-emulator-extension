# WebXR emulator extension

WebXR emulator extension is a browser extension which helps your WebXR content creation. It enables to responsively run [WebXR](https://www.w3.org/TR/webxr/) application on your **desktop** browser without the need of any XR devices. 

[Blog post](https://blog.mozvr.com/webxr-emulator-extension/) / YouTube (TBD)

![Screenshot](./screenshots/screenshot.gif)

## Features

- WebXR API polyfill
- Multiple XR devices emulation
- Cross browsers support with [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
<!-- - [Virtual controller (WIP)](./screenshots/virtual-controller.gif) -->

## Status

Currently the development of this extension is still at an early stage.

- Tested only on [Three.js WebVR examples](https://threejs.org/examples/?q=webvr#webvr_ballshooter) so far
- Based on [WebXR device API draft issued on May 21 2019](https://www.w3.org/TR/webxr/)
- No full WebXR API support yet
- No precise device emulation yet
- Supports only trigger button, not other buttons
- Supports only VR, not AR yet

## Browsers

This extension is built on top of [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions). It works on Firefox, Chrome, and other browsers supporting the API.

## How to use

1. Go to the addon stores to install
- Firefox: https://addons.mozilla.org/es/firefox/addon/webxr-api-emulator
- Chrome: **TBD**

2. Go to WebXR application page (for example, [Three.js examples](https://threejs.org/examples/?q=webvr#webvr_ballshooter)). You will notice that the application detects that you have a VR device (emulated) and it will let you enter the immersive (VR) mode.

3. Open "WebXR" tab in the browser developer tool ([Firefox](https://developer.mozilla.org/en-US/docs/Tools), [Chrome](https://developers.google.com/web/tools/chrome-devtools/)) to controll the emulated devices. You can move the headset and controllers and trigger the controller buttons. You will see their transforms reflected in the WebXR application.

![WebXR tab](./screenshots/tab.png)

## Configuration

You can congifure some settings from the left top in the WebXR tab. To reflect the change, you need to reload the application page.

### Device

You can switch emulated device. The difference between devices is just degrees of freedom and the number of controllers for now.

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

## For development

If you want to develop or debug this extension, download this repositoy and install the extension into your browser as developermode. ([Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox), [Chrome](https://developer.chrome.com/extensions/getstarted))

## Kudos

Thanks to [WebVR-Extension project](https://github.com/spite/WebVR-Extension), it was a true inspiration for us when building this one.

## License

Mozilla Public License Version 2.0
