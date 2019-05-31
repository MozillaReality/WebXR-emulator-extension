const source = '(' + injectedScript + ')();';
const script = document.createElement('script');
script.textContent = source;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
