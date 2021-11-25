import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { PluginObj, PluginPass, transformSync } from '@babel/core';
import { NodePath } from '@babel/traverse';

import {
	LOGICAL_OPERATORS,
	assignmentExpression,
	binaryExpression,
	callExpression,
	cloneNode,
	identifier,
	logicalExpression,
	numericLiteral,
	sequenceExpression,
	unaryExpression,
  } from "@babel/types";

// https://babeljs.io/docs/en/
// https://lihautan.com/step-by-step-guide-for-writing-a-babel-transformation/
// https://lihautan.com/babel-ast-explorer/

describe("test acorn basics (TS)", () => {

	it("should change identifier with traversing", () => {
		const code = `const n = 1`;
		const ast = parse(code, {
			sourceFilename: 'test',
			sourceType: 'script',
			startLine: 1,
		});
		traverse(ast, {
			enter(path) {
				// in this example change all the variable `n` to `x`
				if (path.isIdentifier({ name: 'n' })) {
					path.node.name = 'x';
				}
			},
		});
		const output = generate(ast);
		expect(output.code).toBe(`const x = 1;`);
	});

	it("should change identifier with custom plugin", () => {
		const code = 'const n =\n1';

		const output = transformSync(code, {
			retainLines: true,
			plugins: [
				function myCustomPlugin(): PluginObj<PluginPass> {
					return {
						visitor: {
							Identifier(path: any) {
								// in this example change all the variable `n` to `x`
								if (path.isIdentifier({ name: 'n' })) {
									path.node.name = 'x';
								}
							},
						},
					};
				},
			],
		});
		expect(output?.code).toBe('const x =\n1;');
	});

	it("should turn read access to getter call", () => {
		const code = 'var v1 = v2;';
		const output = transformSync(code, {
			retainLines: true,
			plugins: [
				function(): PluginObj<PluginPass> {
					return {
						visitor: {
							Identifier(path:NodePath) {
								patchId(path);
							},
						},
					};
				},
			],
		});
		expect(output?.code).toBe('var v1 = __get_v2();');
	});

});

function patchId(path:NodePath) {
	if (path.isIdentifier()) {
		if (!path.node.name.startsWith('__')) {
			switch (getPatchType(path)) {
				case 'getter':
					path.replaceWith(callExpression(
						identifier('__get_' + path.node.name),
						[]
					));
					break;
				case 'setter':
					break;
			}
		}
	}
}

function getPatchType(path:NodePath): string {
	// return (path.key === 'id' && path.parent.type === 'VariableDeclaration')
	// 	|| (path.key === 'left' && path.parent.type === 'AssignmentExpression');
	var ret = 'getter';
	if (path.key === 'id') {
		if ((path.parent.type === 'VariableDeclaration')
			|| (path.parent.type === 'VariableDeclarator')) {
			ret = 'none';
		}
	}
	if (path.key === 'left') {
		if (path.parent.type === 'AssignmentExpression') {
			ret = 'setter';
		}
	}
	return ret;
}
