import { BabelFileResult, PluginObj, PluginPass, transformSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import { callExpression, identifier, memberExpression } from "@babel/types";
import { AppScope } from "./appscope";
import { Expr, isDynamic, parseExpr } from "./expr";
import { SourcePos } from "./preprocessor";
import { StringBuf } from './util';

export class AppValue {
	scope: AppScope;
	key: string;
	val: any;
	expr: Expr|undefined;
	refs: Set<string>;
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
		this.refs = new Set();
		this.spos = spos;
	}

	compile() {
		if (this.expr) {
			this._patchExpr(this.expr);
		}
	}

	output(sb:StringBuf, addAccessors=true): StringBuf {
		var key = this.key;
		var val = this.val;
		var expr = this.expr;
		if (expr) {
			if (expr.code.startsWith('function(')) {
				sb.add(`__this.${key} = __add({v:${expr.code}});\n`);
			} else {
				sb.add(`__this.${key} = __add({fn:function() {${expr.code}}});\n`);
			}
		} else if (typeof val === 'string') {
			val = val.replace('\n', '\\n');
			val = val.replace('\r', '');
			val = val.replace('\t', '\\t');
			val = val.replace('"', '\\"');
			sb.add(`__this.${key} = __add({v:"${val}"});\n`);
		} else {
			sb.add(`__this.${key} = __add({v:${val}});\n`);
		}
		if (addAccessors) {
			// get/set value
			sb.add(`Object.defineProperty(__this,"${key}",{`
				+ `get:function() {return __rt.get(${key})}, `
				+ `set:function(v) {return __rt.set(${key}, v)}});\n`);
			// get value object as `__value_<name>`
			sb.add(`Object.defineProperty(__this,"__value_${key}",`
				+ `{get:function() {return ${key}}});\n`);
		}
		return sb;
	}

	_patchExpr(expr:Expr, rpatchData=false): string {
		var locals = new Set(['null', 'true', 'false', 'console', 'document', 'window']);
		this._collectLocalIds(expr, locals);
		const output = this._patchIds(expr, locals);
		expr.code = output?.code ? output?.code : '';
		return expr.code;
	}
	
	_collectLocalIds(expr:Expr, locals:Set<string>) {
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
	_patchIds(expr:Expr,
			locals:Set<string>): BabelFileResult | null {
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
										that._patchId(path);
									}
								}
							},
						},
					};
				},
			],
		});
	}
	
	_patchId(path:NodePath) {
		if (path.isIdentifier()) {
			if (!path.node.name.startsWith('__')) {
				if (path.key !== 'id' || path.parent.type !== 'VariableDeclarator') {
					// not a var declaration
					if (path.key !== 'property') {
						// not a dot access
						var name = path.node.name;
						var scope = this._getScopeForIdentifier(name);
						if (scope) {
							this.refs.add(scope.id + '.' + name);
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
	
	_getScopeForIdentifier(name:string): AppScope | undefined {
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
