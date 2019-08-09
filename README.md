Status: In development. [Any feedback is very welcome.](https://github.com/MozillaReality/WebXR-emulator-extension/issues)

# WebXR-emulator-extension

This WebExtension enables you to run immersive (VR) [WebXR](https://www.w3.org/TR/webxr/) application on your desktop browser without any XR devices.
It helps your WebXR contents creation.

![Screenshot](./screenshots/screenshot.gif)


## Background

Currently immersive WebXR contents creation is hard because of few browsers and devices supporting WebXR.
Even if there are many enough, still awkward to test for developers.
They need to write code on desktop, wear headset/controllers for debug, back to desktop for update the code, and repeating.
It'll be harder if they want to support two or more many devices especially if the devices are different types,
for example 3dof or 6dof, controllers have different buttons, and so on.

This extension resolves the problems by providing a way to run immersive WebXR application on desktop browser with various type of XR devices emulator.


## Features

- WebXR API polyfill
- Headset device emulator
- Controller device emulator
- [Virtual controller (WIP)](./screenshots/virtual-controller.gif)

Currently this extension is very early stage. 

- Targeting only [Three.js WebVR examples](https://threejs.org/examples/?q=webvr) so far

## Browsers

We test this project on the latest desktop Firefox/Chrome. [Bug reports from other platforms are very welcome.](https://github.com/MozillaReality/WebXR-emulator-extension/issues)

## Install

Download this project and install extension to your browser. This extension is in development. I recommend temporary/Developer mode installation.

### FireFox

[Temporary installation in Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox)

### Chrome

[Getting Started Tutorial](https://developer.chrome.com/extensions/getstarted)


## Usage

Install this extension to your web browser, access WebXR application (for example, [Three.js examples](https://threejs.org/examples/?q=webvr)), and then open WebXR panel in developer tool. You can control position and roation of devices in the panel.

### Configuration

![Configuration](./screenshots/configuration.png)

#### Device

You can switch device emulator. Currently the difference is just degrees of freedom. Not precisely emulated yet.

| Device | Description |
| ---- | ---- |
| None | no dof |
| OculusGo | 3dof headset and 3dof controller |
| OculusQuest | 6dof headset and 6dof controller |

#### Stereo Effect

You can enable/disable Stereo Effect which renders two views.

| StereoEffect | Description |
| ---- | ---- |
| Enable | Enables Stereo effect |
| Disable | Disables Stereo effect |


## Similar projects

- [WebVR-Extension](https://github.com/spite/WebVR-Extension)
- [webxr-polyfill](https://github.com/immersive-web/webxr-polyfill)


## License

Mozilla Public License Version 2.0
