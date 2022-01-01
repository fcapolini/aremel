### TDD + TypeScript

[Testing with jest in TypeScript](https://itnext.io/testing-with-jest-in-typescript-cc1cd0095421)

```bash
npm init -y
npm i -D typescript
npx tsc --init
mkdir out
mkdir src
```

tsconfig.json:

```json
	"include": ["src/**/*"],
...
	"rootDir": "./src",
...
	"outDir": "./out",
...
```

package.json:

```json
...
	"scripts": {
    "build": "tsc",
    "test": "jest"
  }
...
```

```bash
npm i -D jest ts-jest @types/jest
npx ts-jest config:init
mkdir test
```

example

./src/calc.ts:

```js
export function add(a:number, b:number): number {
	return a + b;
}
```

./test/calc.test.js:

```js
import { add } from "../src/calc";
describe("test add function", () => {
  it("should return 15 for add(10,5)", () => {
    expect(add(10, 5)).toBe(15);
  });
it("should return 5 for add(2,3)", () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

```bash
npm test
```

[follow up](https://itnext.io/debug-your-tests-in-typescript-with-visual-studio-code-911a4cada9cd)

add [Jest Test Explorer](https://marketplace.visualstudio.com/items?itemName=kavod-io.vscode-jest-test-adapter) VSC extension

### Acorn (no, replaced with Babel)

[Acorn](https://github.com/acornjs/acorn) ([npm](https://www.npmjs.com/package/acorn)) JavaScript parser

```bash
npm install acorn
npm install acorn-walk
# escodegen is used to turn parsed JS back to source code
npm install escodegen
```

Removed:

```bash
npm remove acorn
npm remove @types/acorn
acorn-walk
escodegen
```

### Babel

[Babel](https://babeljs.io)

```bash
# npm install @babel/core
npm install @babel/parser
npm install @babel/traverse
npm install @babel/generator
```

### Express

```bash
npm install express --save
npm install @types/express
```

example

./src/index.ts

```js
import express from 'express';

const PORT = 8000;
const app = express();
app.get('/', (req, res) => res.send('Express + TypeScript Server'));
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
```

```bash
cd out
node express.js
```

### Aremel

```bash
mkdir docroot
```

### Browserify - no: now in companion project `aremel-client`

```bash
# npm install -g browserify
# npm install -g watchify
# # npm install --save-dev tinyify
```

### [Showdown](https://www.npmjs.com/package/showdown) for markdown rendering

```bash
npm install showdown
npm install @types/showdown
```

### [Highlight.js](https://www.npmjs.com/package/highlight.js) for syntax highlighting in markdown

https://github.com/highlightjs/highlight.js

```bash
npm install highlight.js
```

and https://highlightjs.org/download/ for the client lib

### [safe-eval](https://www.npmjs.com/package/safe-eval) for more secure server-side logic evaluation
```bash
# npm install safe-eval
```
see https://github.com/advisories/GHSA-9pcf-h8q9-63f6
Since we're actually executing more controlled code (even in the playground) safe-eval security should be enough for us. But we don't want to have this vulnerability marked out for Aremel, so we'll take its source code and bring into Aremel w/ credits

### Express rate limit

* https://github.com/fcapolini/aremel/security/code-scanning/35?query=ref%3Arefs%2Fheads%2Fmaster
* https://www.npmjs.com/package/express-rate-limit
* https://github.com/nfriedly/express-rate-limit

```bash
npm install express-rate-limit
```
