* [TDD + TypeScript](https://itnext.io/testing-with-jest-in-typescript-cc1cd0095421)

* [Node.js + Express.js](https://www.javatpoint.com/expressjs-tutorial)

* [AcornJS](https://github.com/acornjs/acorn), [npm](https://www.npmjs.com/package/acorn)

* [ESTree Spec](https://github.com/estree/estree)

* [escodegen](https://github.com/estools/escodegen)

* [BabelJs](https://babeljs.io/docs/en/)
  * [Step-by-step guide for writing a custom babel transformation](https://lihautan.com/step-by-step-guide-for-writing-a-babel-transformation/)
  * [Babel AST Explorer](https://lihautan.com/babel-ast-explorer/)
  * [estexplorer](https://astexplorer.net)
  * identifier validation and reserved keywords: @babel/helper-validator-identifier/lib
  
* [Compiler API (TypeScript)](https://learning-notes.mistermicheels.com/javascript/typescript/compiler-api) very interesting [but not yet stable](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API); we'll stick to ~~Acorn~~ Babel for the time being

* [Express](http://expressjs.com)
  * [Using TypeScript with Node.js and Express](https://blog.logrocket.com/typescript-with-node-js-and-express/)
  * [Node.js - Express Framework](https://www.tutorialspoint.com/nodejs/nodejs_express_framework.htm)
  
* HTML parsing
  * [Fast HTML Parser](https://www.npmjs.com/package/node-html-parser)
  * [jsdom](https://www.npmjs.com/package/jsdom) (uses parse5)
  * [parse5](https://www.npmjs.com/package/parse5)
    * can report [element and attribute locations](https://github.com/inikulin/parse5/tree/master/packages/parse5/docs/source-code-location)
    * for locations it assumes a single source file; Aremel's preprocessor will add a `data-*` attribute to root elements of included/expanded markup to trace what source files elements come from
  
* [html5-test-page](https://github.com/cbracco/html5-test-page/blob/master/index.html)

* [TypeScript mixins](https://www.typescriptlang.org/docs/handbook/mixins.html)

* [Browserify](https://browserify.org)

  * [tinyify](https://www.npmjs.com/package/tinyify)

  * ```bash
    npm install --save-dev tinyify
    cd docroot/.aremel/bin
    browserify -p tinyify client.js > bundle.min.js
    ```

* [mocha](https://mochajs.org)
  * [Unit testing node applications with TypeScript](https://journal.artfuldev.com/unit-testing-node-applications-with-typescript-using-mocha-and-chai-384ef05f32b2)

* [Learning to Swim with Piscina, the node.js worker pool](https://www.nearform.com/blog/learning-to-swim-with-piscina-the-node-js-worker-pool/#content)
