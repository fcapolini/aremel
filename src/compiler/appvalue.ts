import { BabelFileResult, PluginObj, PluginPass, transformSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import { callExpression, identifier, memberExpression } from "@babel/types";
import { AppScope } from "./appscope";
import { Expr, isDynamic, parseExpr } from "./expr";
import { SourcePos } from "./preprocessor";

export class AppValue {
	scope: AppScope;
	key: string;
	val: any;
	expr: Expr|undefined;
	spos: SourcePos|undefined;

	constructor(scope:AppScope, key:string, val:any, spos?:SourcePos) {
		this.scope = scope;
		this.key = key;
		if (isDynamic(val)) {
			this.expr = parseExpr(val, spos?.fname, spos?.line);
			this.val = null;
		} else {
			this.val = val;
		}
		this.spos = spos;
	}

	compile() {
		if (this.expr) {
			var refPaths = new Set<string>();
			this.patchExpr(this.expr, refPaths);
		}
	}

	patchExpr(expr:Expr, refPaths:Set<string>, patchData=false): string {
		var locals = new Set(['null', 'true', 'false', 'console', 'document', 'window']);
		this.collectLocalIds(expr, locals);
		var refs = new Map<string,Set<string>>();
		const output = this.patchIds(expr, locals, refs, patchData);
		refs.forEach((v:Set<string>, k:string) => {
			v.forEach((v:string) => {
				refPaths.add(v);
			});
		});
		expr.code = output?.code ? output?.code : '';
		return expr.code;
	}
	
	collectLocalIds(expr:Expr, locals:Set<string>) {
		transformSync(expr.src, {
			plugins: [
				function collectLocalIds() {
					return {
						visitor: {
							Identifier(path:NodePath) {
								if (path.isIdentifier()) {
									if (path.key === 'id' &&
											path.parent.type === 'VariableDeclarator') {
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
	
	// turns accesses to non-local, non '__' identifiers into fields of the
	// relevant `__scope_<id>` object
	patchIds(expr:Expr,
			locals:Set<string>,
			refPaths:Map<string,Set<string>>,
			patchData:boolean): BabelFileResult | null {
		var that = this;
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
										that.patchId(path, paths, patchData);
									}
								}
							},
						},
					};
				},
			],
		});
	}
	
	patchId(path:NodePath, refPaths:Set<string>, patchData=false) {
		if (path.isIdentifier()) {
			if (!path.node.name.startsWith('__')) {
				if (path.key !== 'id' || path.parent.type !== 'VariableDeclarator') {
					// not a var declaration
					if (path.key !== 'property') {
						// not a dot access
						var name = path.node.name;
						refPaths.add(name);
						var scope = this.getScopeForIdentifier(name);
						if (scope) {
							path.replaceWith(memberExpression(
								identifier('__scope_' + scope.id),
								identifier(name)
							));
						} else {
							//TODO
						}
					}
				}
			}
		}
	}
	
	getScopeForIdentifier(name:string): AppScope | undefined {
		var scope:AppScope|undefined = this.scope;
		while (scope) {
			if (scope.values.has(name)) {
				return scope;
			}
			scope = scope.parent;
		}
		return undefined;
	}

}
