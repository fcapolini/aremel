import acorn from "acorn";
import { assert } from "chai";
import { generate } from "escodegen";
import fs from "fs";
import path from "path";
import Code from "../../src/compiler/code";
import Loader from "../../src/compiler/loader";

const rootpath = path.join(__dirname, 'processor');
const loader = new Loader(rootpath);

describe('compiler/code', function () {

  it(`should load file1.html`, async () => {
    // const source = await loader.load('file1.html');
    // const code = new Code(source);
    // const txt1 = generate(code.ast);
    // const ast2 = await loadJS('file1.js');
    // const txt2 = generate(ast2);
    // assert.equal(txt1, txt2);
  });

});

async function loadJS(fname: string): Promise<acorn.Node> {
  const pathname = path.join(rootpath, fname);
  const txt = await fs.promises.readFile(pathname, { encoding: 'utf8' });
  const ast = acorn.parse(txt, {
    ecmaVersion: 2016,
    sourceType: 'script',
    locations: true,
    sourceFile: fname
  });
  return ast;
}
