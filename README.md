Status: In development. [Any feedback is very welcome.](https://github.com/MozillaReality/WebXR-emulator-extension/issues)

# WebXR-emulator-extension

This WebExtension enables you to run immersive (VR) WebXR application on your desktop browser without any XR devices.
It helps WebXR contents creation.

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
- Virtual controller (WIP)

Currently this extension is very early stage. 

- Targeting only [Three.js WebVR examples](https://threejs.org/examples/?q=webvr) so far


## Videos

WebXR API and controller emulation

![Emulation](./screenshots/controller-emulator.gif)

Virtual controller

![Virtual controller](./screenshots/virtual-controller.gif)


## Install

Download this project and install extension to your browser. This extension is in development. I recommend temporary/Developer mode installation.

### FireFox

[Temporary installation in Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox)

### Chrome

[Getting Started Tutorial](https://developer.chrome.com/extensions/getstarted)


## Usage

Install this extension to your web browser. And then access WebXR application.

### Headset and Controller controls

You can control Headset and Controller with keys. I may update UI later.

Headset and Controller common

| Key | function |
| ---- | ---- |
| shift | While releasing: Headset, While pressing: Controller |
| a | Move left |
| d | Move right |
| w | Move up |
| s | Move down |
| z | Move forward |
| x | Move backward |
| j | turn left |
| l | turn right |
| i | turn up |
| k | turn down |
| , | turn clockwise |
| m | turn counter-clockwise |

Only Controller

| Key | function |
| ---- | ---- |
| Space | Trigger button |

### Configuration

If you click the extension icon, configuration popup opens.

![Configuration](./screenshots/configuration.png)

#### Device

You can switch device emulator. Currently just switches degrees of freedom.

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
