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

### Acorn - no, replaced with Babel

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

