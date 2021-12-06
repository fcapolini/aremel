import { BabelFileResult, PluginObj, PluginPass, transformSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import { ExpressionStatement, identifier, MemberExpression, memberExpression, Program, returnStatement } from "@babel/types";
import { JS_DATALENGTH_VAR, JS_DATAOFFSET_VAR, JS_DATA_VAR, JS_EVENT_VALUE_PREFIX, JS_HANDLER_VALUE_PREFIX } from "./app";
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
				if (/^\s*[\[|\{]/.test(this.expr.src)) {
					// JSON
					this.expr.code = `return ${this.expr.src};`;
				} else {
					// JS
					this._patchExpr(this.expr);
					if (this.expr?.fndecl) {
						//TODO throw error
					}
				}
			} else {
				this._patchExpr(this.expr);
				if (this.expr?.fndecl) {
					// function values don't get refreshed by changes in
					// values they reference
					this.refs.clear();
				}
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
			if (expr.fndecl) {
				if (key.startsWith(JS_EVENT_VALUE_PREFIX)) {
					key = key.substr(JS_EVENT_VALUE_PREFIX.length);
					this._outputEvHandler(key, expr, sb);
				} else {
					this._cleanupFunctionCode(expr);
					sb.add(`__this.${key} = ${expr.code};\n`);
				}
			} else if (key === JS_DATA_VAR) {
				sb.add(`var ${key} = __this.${key} = __add(__this,"${key}",__data ? __data : {fn:function() {${expr.code}}});\n`);
			} else {
				sb.add(`var ${key} = __this.${key} = __add(__this,"${key}",{fn:function() {${expr.code}}});\n`);
			}
		} else if (typeof val === 'string') {
			val = val.replace(/\\/g, '\\\\');
			val = val.replace(/\n/g, '\\n');
			val = val.replace(/\r/g, '');
			val = val.replace(/\t/g, '\\t');
			val = val.replace(/"/g, '\\"');
			sb.add(`var ${key} = __this.${key} = __add(__this,"${key}",{v:"${val}"});\n`);
		} else {
			sb.add(`var ${key} = __this.${key} = __add(__this,"${key}",{v:${val}});\n`);
		}
		if (addAccessors && !expr?.fndecl) {
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
			if (key === JS_DATA_VAR) {
				sb.add(`__link({"o":__this.__value_${key}, "v":function() {return __this.__value_${JS_DATAOFFSET_VAR};}});\n`);
				sb.add(`__link({"o":__this.__value_${key}, "v":function() {return __this.__value_${JS_DATALENGTH_VAR};}});\n`);
			}
		}
		return sb;
	}

	_outputEvHandler(key:string, expr:Expr, sb:StringBuf) {
		var p = key.split(':');
		var dom = '__this.__dom';
		var scope;
		if (p.length > 1) {
			switch (p[0]) {
				case 'document':
					dom = '__scope_0.__doc';
					break;
				case 'window':
					dom = '__scope_0.__win';
					break;
				default:
					scope = this._getScopeForIdentifier(this.scope, p[0]);
					if (scope) {
						dom = `__scope_${scope.id}.${p[0]}`;
					} else {
						//TODO: throw error
						return;
					}
			}
		}
		var evtype = p[p.length - 1];
		this._cleanupFunctionCode(expr);
		sb.add(`__ev({e:${dom},t:"${evtype}",h:${expr.code}});\n`);
		// this._getScopeForIdentifier(this.scope, )
	}

	_cleanupFunctionCode(expr:Expr) {
		if (expr.code.startsWith('(function(') && expr.code.endsWith(');')) {
			expr.code = expr.code.substr(1, expr.code.length - 3);
		} else if (expr.code.endsWith(';')) {
			expr.code = expr.code.substr(0, expr.code.length - 1);
		}
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

		// workaround:
		// in order to accept [[function() {console.log()}]] constructs
		// in addition to [[() => console.log()]], we wrap it in parens
		if (/^\s*function\s*\(/.test(expr.src)) {
			expr.src = `(${expr.src})`;
		}

		this._collectLocalIds(expr, locals);
		var isFunctionDeclaration = new Array();
		const output = this._patchCode(expr, locals, isFunctionDeclaration);
		expr.code = output?.code ? output?.code : '';
		expr.fndecl = (isFunctionDeclaration.length > 0);

		// remove possible initial empty statement due to workaround above
		// (imperfect but harmless implementation)
		if (expr.code.startsWith(';')) {
			expr.code = expr.code.substr(1);
		}

		return expr.code;
	}
	
	//TODO: nested scopes (in nested function declarations)
	_collectLocalIds(expr:Expr, locals:Set<string>) {
		transformSync(expr.src, {
			plugins: [
				function collectLocalIds() {
					return {
						visitor: {
							Identifier(path:NodePath) {
								if (path.isIdentifier()) {
									if ((path.key === 'id' &&
											path.parent.type === 'VariableDeclarator')
											|| path.listKey === 'params') {
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
			locals:Set<string>,
			isFunctionDeclaration:Array<any>): BabelFileResult | null {
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
				//TODO: don't add return to function declarations
				function addReturn(): PluginObj<PluginPass> {
					return {
						visitor: {
							ExpressionStatement(path:NodePath) {
								if (path.isExpressionStatement() &&
										path.parentPath.isProgram()) {
									var node:ExpressionStatement = path.node;
									var type = node.expression.type;
									if (type !== 'ArrowFunctionExpression' &&
											type !== 'FunctionExpression') {
										var program = path.parent as Program;
										var i = program.body.indexOf(node);
										if (i == (program.body.length - 1)) {
											path.replaceWith(returnStatement(
												node.expression
											));
										}
									} else {
										isFunctionDeclaration.push(true);
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
						var scope:AppScope|undefined = this.scope;

						if (name === this.key) {
							scope = scope.parent;
						}

						scope = this._getScopeForIdentifier(scope, name);
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
							var scope:AppScope|undefined = this.scope;

							if (name === this.key) {
								scope = scope.parent;
							}	

							scope = this._getScopeForPathname(scope, parts);
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

	_getScopeForPathname(scope:AppScope|undefined,
						parts:Array<string>): AppScope | undefined {
		// var scope:AppScope|undefined = this.scope;
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
