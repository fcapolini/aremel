import { BabelFileResult, PluginObj, PluginPass, transformSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import { ExpressionStatement, identifier, MemberExpression, memberExpression, Program, returnStatement } from "@babel/types";
import { JS_DATA_VAR, JS_HANDLER_VALUE_PREFIX } from "./app";
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
			if (this.key === JS_DATA_VAR) {
				this.expr.code = `return ${this.expr.src};`;
			} else {
				this._patchExpr(this.expr);
			}
			if (this.key.startsWith(JS_HANDLER_VALUE_PREFIX)) {
				this.refs.clear();
				var name = this.key.substr(JS_HANDLER_VALUE_PREFIX.length);
				var scope = this._getScopeForIdentifier(this.scope, name);
				if (scope) {
					this.refs.add(scope.id + '.' + name);
				} else {
					//TODO
				}
			}
		}
	}

	output(sb:StringBuf, addAccessors=true): StringBuf {
		var key = this.key;
		var val = this.val;
		var expr = this.expr;
		if (expr) {
			if (expr.code.startsWith('function(')) {
				sb.add(`var ${key} = __this.${key} = __add(__this,"${key}",{v:${expr.code}});\n`);
			} else {
				sb.add(`var ${key} = __this.${key} = __add(__this,"${key}",{fn:function() {${expr.code}}});\n`);
			}
		} else if (typeof val === 'string') {
			val = val.replace('\n', '\\n');
			val = val.replace('\r', '');
			val = val.replace('\t', '\\t');
			val = val.replace('"', '\\"');
			sb.add(`var ${key} = __this.${key} = __add(__this,"${key}",{v:"${val}"});\n`);
		} else {
			sb.add(`var ${key} = __this.${key} = __add(__this,"${key}",{v:${val}});\n`);
		}
		if (addAccessors) {
			// get/set value
			sb.add(`Object.defineProperty(__this,"${key}",{`
				+ `get:function() {return __rt.get(${key})}, `
				+ `set:function(__v_) {return __rt.set(${key}, __v_)}});\n`);
			// get value object as `__value_<name>`
			sb.add(`Object.defineProperty(__this,"__value_${key}",`
				+ `{get:function() {return ${key}}});\n`);
			// link to references values
			this.refs.forEach((ref) => {
				var p = ref.split('.');
				var observer = `__this.__value_${key}`;

				var scopeId:number|undefined = parseInt(p[0]);
				var pp = new Array<string>();
				do {
					pp.unshift(`__scope_${scopeId}`);
					var s:AppScope = this.scope.app.scopes[scopeId];
					scopeId = s?.parent?.id;
				} while (scopeId !== undefined);
				pp.push(`__value_${p[1]}`);
				var observed = pp.join('.');

				sb.add(`__link({"o":${observer}, "v":function() {return ${observed};}});\n`);
			});
		}
		return sb;
	}

	// https://lihautan.com/babel-ast-explorer/
	_patchExpr(expr:Expr, rpatchData=false): string {
		var locals = new Set(['null', 'true', 'false', 'console', 'document', 'window']);

		// workaround:
		// in order to prevent babeljs to parse e.g. "foo" as a directive
		// instead of an expression statement, we prefix expressions starting
		// with `"` or `'` with an empty statement
		if (/^\s*['"]/.test(expr.src)) {
			expr.src = ';' + expr.src;
		}

		this._collectLocalIds(expr, locals);
		const output = this._patchCode(expr, locals);
		expr.code = output?.code ? output?.code : '';

		// remove possible initial empty statement due to workaround above
		if (expr.code.startsWith(';')) {
			expr.code = expr.code.substr(1);
		}

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
	_patchCode(expr:Expr,
			locals:Set<string>): BabelFileResult | null {
		var that = this;
		return transformSync(expr.src, {
			parserOpts: {
				sourceType: 'script',
				sourceFilename: expr.origin,
				startLine: expr.lineNr,
			},
			retainLines: true,
			plugins: [
				function patchIds(): PluginObj<PluginPass> {
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
				function addReturn(): PluginObj<PluginPass> {
					return {
						visitor: {
							ExpressionStatement(path:NodePath) {
								if (path.isExpressionStatement() &&
										path.parentPath.isProgram()) {
									var node:ExpressionStatement = path.node;
									var program = path.parent as Program;
									var i = program.body.indexOf(node);
									if (i == (program.body.length - 1)) {
										// console.log(node);
										path.replaceWith(returnStatement(
											node.expression
										));
									}
								}
							}
						}
					}
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
						var scope = this._getScopeForIdentifier(this.scope, name);
						if (scope) {
							this.refs.add(scope.id + '.' + name);
							path.replaceWith(memberExpression(
								identifier('__scope_' + scope.id),
								identifier(name)
							));
						} else {
							//TODO
						}
					} else {
						var parts = this._getPropertyPathname(path, []);
						if (parts.length > 0 && parts.join('.').indexOf('#') < 0) {
							// valid path
							var name = parts.pop() as string;
							// console.log(parts);
							var scope = this._getScopeForPathname(parts);
							if (scope) {
								this.refs.add(scope.id + '.' + name);

								var p:NodePath|null = path;
								while (p.parentPath && p.parentPath.type === 'MemberExpression') {
									p = p.parentPath;
								}
								
								var scopes = new Array<AppScope>();
								while (scope) {
									scopes.push(scope);
									scope = scope.parent;
								}

								var left:any = identifier('__scope_' + scopes.pop()?.id);
								if (scopes.length > 0) {
									left = memberExpression(
										left,
										identifier('__scope_' + scopes.pop()?.id)
									);
								}

								p?.replaceWith(memberExpression(
									left,
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
	}
	
	_getScopeForIdentifier(scope:AppScope|undefined,
							name:string,
							childScopes=false): AppScope|undefined {
		while (scope) {
			if (scope.values.has(name)) {
				return scope;
			}
			if (childScopes) {
				for (var child of scope.children) {
					if (child.aka && child.aka === name) {
						return child;
					}
				}
			}
			scope = scope.parent;
		}
		return undefined;
	}

	_getScopeForPathname(parts:Array<string>): AppScope | undefined {
		var scope:AppScope|undefined = this.scope;
		while (scope && parts.length > 0) {
			var part = parts.shift() as string;
			scope = this._getScopeForIdentifier(scope, part, true);
		}
		return scope;
	}

	_getPropertyPathname(path:NodePath, parts:Array<string>) {
		function f(node:MemberExpression) {
			if (node.object.type === 'MemberExpression') {
				f(node.object);
			} else if (node.object.type === 'Identifier') {
				parts.push(node.object.name);
			} else {
				// invalid path
				parts.push('#');
			}
			if (node.property.type === 'Identifier') {
				parts.push(node.property.name);
			}
		}
		if (path.parentPath?.isMemberExpression()) {
			f(path.parentPath.node);
		}
		return parts;
	}

}
