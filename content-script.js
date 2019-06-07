const source = '(function() {'
+   'const Controller = (' + ControllerInjection + ')();'
+   '(' + WebXRPolyfillInjection + ')();'
+ '})();';
const script = document.createElement('script');
script.textContent = source;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
