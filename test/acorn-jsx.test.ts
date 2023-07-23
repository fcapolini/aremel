import acorn from "acorn";
import jsx from "acorn-jsx";
import { extend } from "acorn-jsx-walk";
import * as walk from "acorn-walk";
import { assert } from "chai";

extend(walk.base);

// https://www.npmjs.com/package/acorn
// https://www.npmjs.com/package/acorn-jsx
// https://www.npmjs.com/package/acorn-walk
// https://github.com/sderosiaux/acorn-jsx-walk
// https://github.com/TyrealHu/acorn-typescript

describe('acorn-jsx', function () {

	it("should parse JSX (1)", () => {
		const root = acorn.Parser.extend(jsx()).parse(
      `<html lang={'en'}></html>`, {
        ecmaVersion: 2016,
        sourceType: 'script',
        locations: true,
        sourceFile: 'base'
    });
    assert.exists(root);
    const nodes: string[] = [];
    walk.simple(root, {
      JSXOpeningElement: (node: any) => nodes.push(`JSXOpeningElement ${node.name.name}`),
      JSXClosingElement: (node: any) => nodes.push(`JSXClosingElement ${node.name.name}`),
      JSXAttribute: (node: any) => nodes.push(`JSXAttribute ${node.name.name}`),
    });
    assert.deepEqual(nodes, [
      'JSXAttribute lang',
      'JSXOpeningElement html',
      'JSXClosingElement html'
    ]);
	});

});
