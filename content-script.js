const source = '(function() {'
+   'const _Math = (' + MathInjection + ')();'
+   'const Controller = (' + ControllerInjection + ')();'
+   'const Headset = (' + HeadsetInjection + ')();'
+   '(' + WebXRPolyfillInjection + ')();'
+ '})();';
const script = document.createElement('script');
script.textContent = source;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
