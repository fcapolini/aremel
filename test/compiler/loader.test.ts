import { assert } from "chai";
import path from "path";
import { Loader, Source } from "../../src/compiler/loader";
import * as walk from "acorn-walk";

const factory = new Loader(path.join(__dirname, 'loader'));

describe('compiler/loader', function () {

  it(`should load file1.html`, async () => {
    const source = await factory.load('file1.html');
    assert.equal(source.fnames.length, 1);
    assert.equal(source.fnames[0], 'file1.html');
    assert.equal(source.errors.length, 0);
    assert.exists(source.ast);
    const nodes = dump(source.ast);
    assert.deepEqual(nodes, [
      "JSXOpeningElement html",
      "JSXText \"\n  \"",
      "JSXOpeningElement body",
      "JSXText \"\n    Hi\n  \"",
      "JSXClosingElement body",
      "JSXText \"\n\"",
      "JSXClosingElement html",
    ]);
  });

  it(`shouldn't load inexistent file`, async () => {
    const source = await factory.load('inexistent.file');
    assert.equal(source.fnames.length, 1);
    assert.equal(source.fnames[0], 'inexistent.file');
    assert.equal(source.errors.length, 1);
    assert.isTrue(source.errors[0].message.startsWith('Error: ENOENT'));
    assert.notExists(source.ast);
  });

  it(`shouldn't load file outside root path`, async () => {
    const source = await factory.load('../forbidden.file');
    assert.equal(source.fnames.length, 0);
    assert.equal(source.errors.length, 1);
    assert.equal(source.errors[0].message, 'Forbidden access');
    assert.equal(source.errors[0].name, '../forbidden.file');
    assert.notExists(source.errors[0].origin);
    assert.notExists(source.ast);
  });

  it(`should follow includes (file2.html)`, async () => {
    const source = await factory.load('file2.html');
    assert.equal(source.fnames.length, 2);
    assert.equal(source.fnames[0], 'file2.html');
    assert.equal(source.fnames[1], 'file2_1.htm');
    assert.equal(source.errors.length, 0);
    assert.exists(source.ast);
    const nodes = dump(source.ast);
    assert.deepEqual(nodes, [
      "JSXOpeningElement html",
      "JSXText \"\n  \"",
      "JSXOpeningElement body",
      "JSXText \"\n    Hi\n  \"",
      "JSXClosingElement body",
      "JSXText \"\n\"",
      "JSXClosingElement html",
    ]);
  });

  it(`shouldn't follow forbidden includes (file3.html)`, async () => {
    const source = await factory.load('file3.html');
    assert.equal(source.fnames.length, 1);
    assert.equal(source.fnames[0], 'file3.html');
    assert.equal(source.errors.length, 1);
    assert.equal(source.errors[0].name, '../forbidden.htm');
    assert.equal(source.errors[0].message, 'Forbidden access');
    assert.exists(source.errors[0].origin);
    assert.equal(source.errors[0].origin?.loc?.source, 'file3.html');
    assert.equal(source.errors[0].origin?.loc?.start.line, 3);
    assert.equal(source.errors[0].origin?.loc?.start.column, 4);
  });

  it(`should include recursively (file4.html)`, async () => {
    const source = await factory.load('file4.html');
    assert.equal(source.fnames.length, 3);
    assert.equal(source.fnames[0], 'file4.html');
    assert.equal(source.fnames[1], 'file4/file4_1.htm');
    assert.equal(source.fnames[2], 'file4_2.htm');
    assert.equal(source.errors.length, 0);
    assert.exists(source.ast);
    const nodes = dump(source.ast);
    assert.deepEqual(nodes, [
      "JSXOpeningElement html",
      "JSXText \"\n  \"",
      "JSXOpeningElement body",
      "JSXText \"\n    \n  Hi\n  \n  there\n\n\n  \"",
      "JSXClosingElement body",
      "JSXText \"\n\"",
      "JSXClosingElement html",
    ]);
  });

  it(`shouldn't import twice (file5.html)`, async () => {
    const source = await factory.load('file5.html');
    assert.equal(source.fnames.length, 2);
    assert.equal(source.fnames[0], 'file5.html');
    assert.equal(source.fnames[1], 'file5_1.htm');
    assert.equal(source.errors.length, 0);
    assert.exists(source.ast);
    const nodes = dump(source.ast);
    assert.deepEqual(nodes, [
      "JSXOpeningElement html",
      "JSXText \"\n  \"",
      "JSXOpeningElement body",
      "JSXText \"\n    Hi\n    \n  \"",
      "JSXClosingElement body",
      "JSXText \"\n\"",
      "JSXClosingElement html",
    ]);
  });

  it(`should apply include's root attributes (file6.html)`, async () => {
    const source = await factory.load('file6.html');
    assert.deepEqual(dump(source.ast, true), [
      'JSXOpeningElement html',
      'JSXText "\n  "',
      'JSXAttribute $v0="value0a"',
      'JSXAttribute $v1="value1a"',
      'JSXAttribute $v2="value2b"',
      'JSXAttribute $v4="value4c"',
      'JSXOpeningElement head',
      'JSXText "\n    Hello there\n  "',
      'JSXClosingElement head',
      'JSXText "\n"',
      'JSXClosingElement html'
    ]);
  });

});

function dump(root: acorn.Node | null, attributes = false): string[] {
  const ret: string[] = [];
  root && walk.simple(root, {
    JSXOpeningElement: (node: any) => ret.push(`JSXOpeningElement ${node.name.name}`),
    JSXClosingElement: (node: any) => ret.push(`JSXClosingElement ${node.name.name}`),
    JSXText: (node: any) => ret.push(`JSXText "${node.value}"`),
    JSXAttribute: (node: any) => {
      attributes && ret.push(`JSXAttribute ${node.name.name}="${node.value.value}"`)
    },
  });

  return ret;
}
