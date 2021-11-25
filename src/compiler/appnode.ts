import App, {
	JS_AKA_VAR, JS_ATTR_VALUE_PREFIX, JS_CLASS_VALUE_PREFIX, JS_DATALENGTH_VAR,
	JS_DATAOFFSET_VAR, JS_DATA_VAR, JS_DOC_VAR, JS_DOM_VAR, JS_EVENT_VALUE_PREFIX,
	JS_HANDLER_VALUE_PREFIX, JS_ID_VAR, JS_NOTNULL_FN, JS_STYLE_VALUE_PREFIX,
	Prop } from "./app";
import { patchExpr } from "./code";
import { Expr, isDynamic, parseExpr } from "./expr";
import { HtmlElement, HtmlPos, HtmlText } from "./htmldom";
import Preprocessor from "./preprocessor";
import { makeHyphenName, StringBuf } from "./util";

export class AppNode {
	app: App;
	prepro?: Preprocessor;
	parent?: AppNode;
	aka?: string;
	dom: HtmlElement;
	id: number;
	props: Map<string,Prop>;
	texts: Array<HtmlText>;
	values: Map<string,NodeValue>;
	references: Map<string, Set<string>>;
	children: AppNode[];

	constructor(app:App, dom:HtmlElement, id:number, props:Map<string,Prop>,
				aka?:string, prepro?:Preprocessor, parent?:AppNode) {
		if ((this.parent = parent)) {
			parent.children.push(this);
		}
		this.prepro = prepro;
		this.aka = aka;
		this.app = app;
		this.dom = dom;
		this.id = id;
		this.props = props;
		this.texts = [];
		this.values = new Map();
		this.references = new Map();
		this.children = [];
		if (props.has(JS_DATA_VAR)) {
			this._ensureProp({key:JS_DATAOFFSET_VAR, val:'[[0]]'});
			this._ensureProp({key:JS_DATALENGTH_VAR, val:'[[-1]]'});
		}
	}

	collectValues() {
		for (var key of this.props.keys()) {
			if (key !== JS_AKA_VAR) {
				this.values.set(key, new NodeValue(this, this.props.get(key) as Prop));
			}
		}
		for (var child of this.children) {
			child.collectValues();
		}
	}

	patchCode() {

	}

	output(sb:StringBuf) {
		//
		// enter scope
		//
		if (this.parent) {
			sb.add(`__f = function(__outer,__outer_get_data,__outer_data,__add,__link,__ev,__domGetter,__self) {\n`);
			sb.add(`var __dom = __domGetter(${this.id});\n`);
		} else {
			sb.add(`function(__rt) {\n`);
			// https://stackoverflow.com/a/15992131
			sb.add(`function ${JS_NOTNULL_FN}(v) {return v != null ? v : ""}\n`);
			sb.add(`function __add(v) {__rt.values.push(v); return v;}\n`);
			sb.add(`function __link(l) {__rt.links.push(l);}\n`);
			sb.add(`function __ev(h) {__rt.evhandlers.push(h);}\n`);
			sb.add(`function __domGetter(id) {return __rt.page.nodes[id];}\n`);
		}
		//
		// add object
		//
		if (this.parent) {
			if (this.props.has(JS_DATA_VAR)) {
				sb.add(`var __get_data = null, __set_data = null, data = null;\n`);
			}
			sb.add(`var __this = {__outer:__outer,__dom:__dom,__self:__self};\n`);
		} else {
			sb.add(`var __f, __get_data = null, data = null;\n`);
			sb.add(`var __this = {};\n`);
			sb.add(`var ${JS_DOM_VAR} = __this.${JS_DOM_VAR} = __rt.page.nodes[${this.id}];\n`);
			sb.add(`var ${JS_DOC_VAR} = __this.${JS_DOC_VAR} = ${JS_DOM_VAR}.ownerDocument;\n`);
		}
		if (this.aka) {
			sb.add(`var ${JS_AKA_VAR} = __this.${JS_AKA_VAR} = "${this.aka}";\n`);
		}
		sb.add(`var ${JS_ID_VAR} = __this.${JS_ID_VAR} = ${this.id};\n`);
		//
		// add named scopes declarations
		//
		if (this.children.length > 0) {
			sb.add('var ');
			this.children.forEach((s,i) => {
				if (s.aka && !s.aka.startsWith('__')) {
					i > 0 ? sb.add(',') : null;
					sb.add(`${s.aka},__get_${s.aka}`);
				}
			});
			sb.add(';\n');
			this.children.forEach((s,i) => {
				if (s.aka && !s.aka.startsWith('__')) {
					sb.add(`__get_${s.aka} = function() {return ${s.aka}};\n`);
				}
			});
		}
		//
		// add properties
		//
		this._outputProps(sb);
		this._outputTexts(sb);
		//
		// add child scopes
		//
		this.children.forEach((child) => child.output(sb));
		//
		// exit scope
		//
		sb.add(`return __this;\n`);
		if (this.parent) {
			sb.add(`}\n`);
			if (this.aka) {
				sb.add(`${this.aka} = __this.${this.aka} = `);
			}
			sb.add(`__f(__this,__get_data,data,__add,__link,__ev,__domGetter,__f);\n`);
		} else {
			sb.add(`}`);
		}
	}

	_outputProps(sb:StringBuf) {
		var keys = new Array<string>();
		for (var key of this.props.keys()) key != JS_AKA_VAR ? keys.push(key) : null;
		keys = keys.sort((a, b) => (a > b ? 1 : (a < b ? -1 : 0)));
		//
		// add declarations
		//
		var names = new Array<string>();
		keys.forEach((key) => {
			if (!key.startsWith(JS_HANDLER_VALUE_PREFIX)
					&& !key.startsWith(JS_EVENT_VALUE_PREFIX)) {
				names.push(key);
				names.push(`__get_${key}`);
				names.push(`__set_${key}`);
				// names.push(`__upd_${key}`);
			}
		});
		if (names.length > 0) {
			sb.add('var ' + names.join(',') + ';\n');
		}
		//
		// add initializations
		//
		for (var key of keys) {
			// non-handlers first
			if (!key.startsWith(JS_HANDLER_VALUE_PREFIX)) {
				this._outputProp(key, this.props.get(key) as Prop, sb);
			}
		}
		for (var key of keys) {
			// handlers second
			if (key.startsWith(JS_HANDLER_VALUE_PREFIX)) {
				this._outputProp(key, this.props.get(key) as Prop, sb);
			}
		}
		if (this.props.has(JS_DATA_VAR)) {
			var paths = new Set<string>([JS_DATAOFFSET_VAR, JS_DATALENGTH_VAR]);
			this._addLinks(this._makeLink(JS_DATA_VAR, paths, []), sb);
		}
	}

	_outputProp(key:string, prop:Prop, sb:StringBuf) {
		var val = prop.val;
		var isHandler = key.startsWith(JS_HANDLER_VALUE_PREFIX);
		var isEvHandler = key.startsWith(JS_EVENT_VALUE_PREFIX);
		var domLinkerPre = '';
		var domLinkerPost = '';
		if (key.startsWith(JS_CLASS_VALUE_PREFIX)) {
			domLinkerPre = `__rt.linkClass(__dom,"${
				makeHyphenName(key.substr(JS_CLASS_VALUE_PREFIX.length))
			}",`;
			domLinkerPost = ')';
		} else if (key.startsWith(JS_STYLE_VALUE_PREFIX)) {
			domLinkerPre = `__rt.linkStyle(__dom,"${
				makeHyphenName(key.substr(JS_STYLE_VALUE_PREFIX.length))
			}",`;
			domLinkerPost = ')';
		} else if (key.startsWith(JS_ATTR_VALUE_PREFIX)) {
			domLinkerPre = `__rt.linkAttr(__dom,"${
				makeHyphenName(key.substr(JS_ATTR_VALUE_PREFIX.length))
			}",`;
			domLinkerPost = ')';
		} else if (key === JS_DATA_VAR) {
			domLinkerPre = '__rt.linkData(__this,';
			domLinkerPost = ')';
		}
		if (typeof val === 'string') {
			if (isDynamic(val)) {
				try {
					var sourcePos = (this.prepro && prop.pos
						? this.prepro.getSourcePos(prop.pos)
						: undefined);
					var expr = (sourcePos
						? parseExpr(val, sourcePos.fname, sourcePos.line)
						: parseExpr(val));
					var refPaths = new Set<string>();
					var code = patchExpr(expr, refPaths, (key == 'data'));
					if (!isEvHandler) {
						if (code.startsWith('{') && code.endsWith('}')) {
							code = code.substr(1, code.length - 2).trim();
						}
					}
					if (isHandler) {
						var path = key.substr(JS_HANDLER_VALUE_PREFIX.length);
						sb.add(`__rt.linkHandler(function() {${code}}, ${path});\n`);
						this.references.set(key, new Set([path]));
					} else if (isEvHandler) {
						key = key.substr(JS_EVENT_VALUE_PREFIX.length);
						var p = key.split(':');
						var dom = (p.length > 1 ? p[0] : '__dom');
						var evtype = (p.length > 0 ? p[p.length - 1] : '');
						sb.add(`__ev({e:${dom},t:"${evtype}",h:${code}});\n`);
					} else {
						if (this.parent && key === JS_DATA_VAR) {
							sb.add('if (__self) {\n');
						}
						sb.add(`${key} = __this.${key} = __add(`
							+ domLinkerPre
							+ (code.startsWith('function(')
								? `{v:${code}}`
								: `{fn:function() {${code}}}`)
							+ domLinkerPost
							+ ');\n');
						if (refPaths.size > 0) {
							this._addLinks(this._makeLink(key, refPaths, []), sb);
							this.references.set(key, refPaths);
						}
						if (this.parent && key === JS_DATA_VAR) {
							sb.add('} else {\n');
							sb.add('data = __this.data = __outer_data;\n');
							sb.add('}\n');
						}
					}
				} catch (ex:any) {
					this.app.errors.push({msg:`addProp(${key}): ${ex}`, pos:prop.pos});
				}
			} else {
				val = val.replace('\n', '\\n');
				val = val.replace('\r', '');
				val = val.replace('\t', '\\t');
				val = val.replace('"', '\\"');
				sb.add(`${key} = __this.${key} = __add(`
					+ domLinkerPre
					+ `{v:"${val}"}`
					+ domLinkerPost
					+ ');\n');
			}
		} else {
			sb.add(`${key} = __this.${key} = __add(`
				+ domLinkerPre
				+ `{v:${val}}`
				+ domLinkerPost
				+ ');\n');
		}
		if (!isHandler && !isEvHandler) {
			sb.add(`__get_${key} = function() {return __rt.get(${key})}\n`);
			sb.add(`__set_${key} = function(v) {return __rt.set(${key}, v)}\n`);
			// sb.add(`__upd_${key} = function(incr, pre) {return __rt.upd(${key}, incr, pre)}\n`);
			sb.add(`Object.defineProperty(__this, "${key}", {get:__get_${key}, set:__set_${key}});\n`);
			sb.add(`Object.defineProperty(__this, "__value_${key}", {get:function() {return ${key}}});\n`);
		}
	}

	_outputTexts(sb:StringBuf) {
		//TODO
	}

	_makeLink(name:string, paths:Set<string>, links:Array<ValueLink>): Array<ValueLink> {
		// patch references to 'data.*'
		var pp = new Array<string>();
		for (var p of paths) pp.push(p);
		for (p of pp) {
			if (p.startsWith('data.')) {
				paths.delete(p);
				paths.add('data');
			}
		}
		// add value link
		for (var p of paths) {
			if (name === 'data' && p === 'data') {
				links.push({observer:'data', observed:'__outer_data'});
			} else {
				links.push({observer:name, observed:p});
			}
		}
		return links;
	}

	_addLinks(links:Array<ValueLink>, sb:StringBuf) {
		for (var l of links) {
			sb.add(`__link({"o":${l.observer}, "v":function() {return ${l.observed};}});\n`);
		}
	}

	_ensureProp(prop:Prop) {
		if (!this.props.has(prop.key)) {
			this.props.set(prop.key, prop);
		}
	}
	
}

export class NodeValue {
	node: AppNode;
	prop: Prop;

	constructor(node:AppNode, prop:Prop) {
		this.node = node;
		this.prop = prop;
	}
}

interface ValueLink {
	observer: string,
	observed: string,
}
