
/* ════ INGLY OS — Bootstrap Safety Layer ════ */
// 1. Console polyfill — some environments lack console.info/debug
(function(){
  /* Robust console polyfill — patches EXISTING console AND creates fallback */
  try {
    var noop = function(){};
    var methods = ['log','info','warn','error','debug','dir','group','groupEnd','time','timeEnd','trace','count','assert','clear','table'];
    var con = window.console = window.console || {};
    methods.forEach(function(m){
      if(typeof con[m] !== 'function') {
        con[m] = (typeof con.log === 'function') ? con.log : noop;
      }
    });
    /* Bind all methods to avoid 'Illegal invocation' */
    methods.forEach(function(m){
      if(con[m] && con[m].bind && !con[m]._bound) {
        try { con[m] = con[m].bind(con); con[m]._bound = true; } catch(e){}
      }
    });
  } catch(e){}
})();
// 2. Ignore list for error boundary
window.__INGLY_IGNORE_ERRORS__ = [
  'console.info is not a function',
  'console.debug is not a function', 
  'ResizeObserver loop',
  'Script error.',
  'cannot read properties of null',
  'is not defined at Object.render',
];
