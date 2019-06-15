const source =  'let xrconfiguration;'
+ '(function() {'
+   'const EventDispatcher = (' + EventDispatcherInjection + ')();'
+   'const Configuration = (' + ConfigurationInjection + ')();'
+   'const _Math = (' + MathInjection + ')();'
+   'const Controller = (' + ControllerInjection + ')();'
+   'const Headset = (' + HeadsetInjection + ')();'
+   '(' + WebXRPolyfillInjection + ')();'
+   'xrconfiguration = new Configuration();'
+   'console.log(this);'
+ '})();';
const script = document.createElement('script');
script.textContent = source;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

const configurationId = 'webxr-extension';
const initialValue = '0';

browser.storage.local.get(configurationId).then(result => {
  const [headsetType] = (result[configurationId] || initialValue).split(':');
  const script2 = document.createElement('script');
  const source2 = ''
  + '(function() {'
  +   'const Configuration = xrconfiguration.constructor;'
  +   'xrconfiguration.setHeadsetType(' + headsetType + ');'
  +   'console.log(xrconfiguration);'
  + '})();';
  script2.textContent = source2;
  (document.head || document.documentElement).appendChild(script2);
  script2.parentNode.removeChild(script2);
});
