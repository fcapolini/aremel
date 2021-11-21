* [TDD + TypeScript](https://itnext.io/testing-with-jest-in-typescript-cc1cd0095421)
* [Node.js + Express.js](https://www.javatpoint.com/expressjs-tutorial)
* [AcornJS](https://github.com/acornjs/acorn), [npm](https://www.npmjs.com/package/acorn)
* [ESTree Spec](https://github.com/estree/estree)
* [Compiler API (TypeScript)](https://learning-notes.mistermicheels.com/javascript/typescript/compiler-api) very interesting [but not yet stable](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API); we'll stick to Acorn for the time being
* [Express](http://expressjs.com)
* [Using TypeScript with Node.js and Express](https://blog.logrocket.com/typescript-with-node-js-and-express/)
* HTML parsing
  * [Fast HTML Parser](https://www.npmjs.com/package/node-html-parser)
  * [jsdom](https://www.npmjs.com/package/jsdom) (uses parse5)
  * [parse5](https://www.npmjs.com/package/parse5)
    * can report [element and attribute locations](https://github.com/inikulin/parse5/tree/master/packages/parse5/docs/source-code-location)
    * for locations it assumes a single source file; Aremel's preprocessor will add a `data-*` attribute to root elements of included/expanded markup to trace what source files elements come from

