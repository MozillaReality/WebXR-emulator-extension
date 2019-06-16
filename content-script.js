const source =  'let xrconfiguration;'
+ '(function() {'
+   'const EventDispatcher = (' + EventDispatcherInjection + ')();'
+   'const Configuration = (' + ConfigurationInjection + ')();'
+   'const _Math = (' + MathInjection + ')();'
+   'const Controller = (' + ControllerInjection + ')();'
+   'const Headset = (' + HeadsetInjection + ')();'
+   'const controller = new Controller();'
+   'const headset = new Headset();'
+   '(' + WebXRPolyfillInjection + ')();'
+   'xrconfiguration = new Configuration();'
+   'xrconfiguration.addEventListener(\'typechange\', event => {'
+     'const deviceType = event.configuration.deviceType;'
+     'headset.setDeviceType(deviceType);'
+     'controller.setDeviceType(deviceType);'
+     'headset.setStereoType(event.configuration.stereoType);'
+   '});'
+   'console.log(this);'
+ '})();';
const script = document.createElement('script');
script.textContent = source;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

const configurationId = 'webxr-extension';

browser.storage.local.get(configurationId).then(result => {
  const script2 = document.createElement('script');
  const source2 = ''
  + '(function() {'
  +   'const Configuration = xrconfiguration.constructor;'
  +   'xrconfiguration.deserialize(\'' + (result[configurationId] || '') + '\');'
  +   'console.log(xrconfiguration);'
  + '})();';
  script2.textContent = source2;
  (document.head || document.documentElement).appendChild(script2);
  script2.parentNode.removeChild(script2);
});
