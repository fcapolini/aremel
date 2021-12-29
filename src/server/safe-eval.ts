import vm from "vm";

// https://github.com/hacksparrow/safe-eval/blob/master/index.js
export default function safeEval(code:string, context:any, opts?:string) {
  var sandbox = {}
  var resultKey = 'SAFE_EVAL_' + Math.floor(Math.random() * 1000000)
  // @ts-ignore
  sandbox[resultKey] = {}
  var clearContext = `
    (function() {
      Function = undefined;
      const keys = Object.getOwnPropertyNames(this).concat(['constructor']);
      keys.forEach((key) => {
        const item = this[key];
        if (!item || typeof item.constructor !== 'function') return;
        this[key].constructor = undefined;
      });
    })();
  `
  code = clearContext + resultKey + '=' + code
  if (context) {
    Object.keys(context).forEach(function (key) {
      // @ts-ignore
      sandbox[key] = context[key]
    })
  }
  vm.runInNewContext(code, sandbox, opts)
  // @ts-ignore
  return sandbox[resultKey]
}
