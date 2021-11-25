import { BabelFileResult, PluginObj, PluginPass, transformSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import { callExpression, identifier, NullLiteralTypeAnnotation } from "@babel/types";
import { Expr } from './expr';

// https://lihautan.com/babel-ast-explorer/
export function patchExpr(expr:Expr, refPaths:Set<string>, patchData=false): string {
	var locals = new Set(['null', 'true', 'false', 'console', 'document', 'window']);
	collectLocalIds(expr, locals);
	var refs = new Map<string,Set<string>>();
	const output = patchIds(expr, locals, refs, patchData);
	// refs.forEach((paths) => paths.forEach((path) => refPaths.add(path)));
	refs.forEach((v:Set<string>, k:string) => {
		v.forEach((v:string) => {
			refPaths.add(v);
		});
	});
	expr.code = output?.code ? output?.code : '';
	return expr.code;
}

function collectLocalIds(expr:Expr, locals:Set<string>) {
	transformSync(expr.src, {
		plugins: [
			function collectLocalIds() {
				return {
					visitor: {
						Identifier(path:NodePath) {
							if (path.isIdentifier()) {
								if (path.parent.type === 'VariableDeclarator') {
									locals.add(path.node.name);
								}
							}
						}
					}
				}
			}
		],
	});
}

// (1) turns accesses to non-local, non '__' identifiers into calls to their getters
// (2) turns assignments to non-local, non '__' identifiers into calls to their setters
// TODO: special treatment for unary operators on non-local, non '__' identifiers
function patchIds(expr:Expr,
				locals:Set<string>,
				refPaths:Map<string,Set<string>>,
				patchData:boolean): BabelFileResult | null {
	return transformSync(expr.src, {
		parserOpts: {
			sourceFilename: expr.origin,
			startLine: expr.lineNr
		},
		retainLines: true,
		plugins: [
			function myCustomPlugin(): PluginObj<PluginPass> {
				return {
					visitor: {
						Identifier(path:NodePath) {
							if (path.isIdentifier()) {
								if (!locals.has(path.node.name)) {
									var paths = new Set<string>();
									refPaths.set(path.node.name, paths);
									patchId(path, paths, patchData);
								}
							}
						},
					},
				};
			},
		],
	});
}

function patchId(path:NodePath, refPaths:Set<string>, patchData=false) {
	if (path.isIdentifier()) {
		if (!path.node.name.startsWith('__')) {
			if (path.key === 'id' && path.parent.type === 'VariableDeclarator') {
				//nop
			} else if (path.key === 'left' && path.parent.type === 'AssignmentExpression') {
				refPaths.add(path.node.name);
				path.parentPath.replaceWith(callExpression(
					identifier('__set_' + path.node.name),
					[path.parent.right]
				));
			} else {
				refPaths.add(path.node.name);
				path.replaceWith(callExpression(
					identifier('__get_' + path.node.name),
					[]
				));
			}
		}
	}
}
