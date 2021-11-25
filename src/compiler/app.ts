import { ValueObj } from "../shared/runtime";
import { patchExpr } from "./code";
import { isDynamic, parseExpr } from "./expr";
import { ELEMENT_NODE, HtmlDocument, HtmlElement, HtmlNode, HtmlPos, HtmlText, TEXT_NODE } from "./htmldom";
import Preprocessor from "./preprocessor";
import { makeCamelName, makeHyphenName, StringBuf } from "./util";

export const DOM_DYNAMIC_ATTR_PREFIX = ':';
export const DOM_CLASS_ATTR_PREFIX = ':class-';
export const DOM_STYLE_ATTR_PREFIX = ':style-';
export const DOM_ATTR_ATTR_PREFIX = ':attr-';
export const DOM_HANDLER_ATTR_PREFIX = ':on-';
export const DOM_EVENT_ATTR_PREFIX = ':event-';
export const DOM_AKA_ATTR = /*:*/'aka';
export const DOM_HIDDEN_ATTR = ':hidden';
export const DOM_EXP_MARKER1 = '[[';
export const DOM_EXP_MARKER2 = ']]';

export const JS_AKA_VAR = '__aka';
export const JS_DOM_VAR = '__dom';
export const JS_DOC_VAR = '__doc';
export const JS_ID_VAR = '__id';
export const JS_CLASS_VALUE_PREFIX = 'class_';
export const JS_STYLE_VALUE_PREFIX = 'style_';
export const JS_ATTR_VALUE_PREFIX = 'attr_';
export const JS_HANDLER_VALUE_PREFIX = 'on_';
export const JS_EVENT_VALUE_PREFIX = 'event_';
export const JS_NOTNULL_FN = '__nn';
export const JS_DATA_VAR = 'data';
export const JS_DATAOFFSET_VAR = 'dataOffset';
export const JS_DATALENGTH_VAR = 'dataLength';
export const JS_AUTOHIDE_CLASS = JS_CLASS_VALUE_PREFIX + '__cerereAutohide';
export const CSS_AUTOHIDE_CLASS = '__cerere-autohide';
export const DOM_ID_ATTR = 'data-cerere';
export const DOM_CLONEINDEX_ATTR = 'data-cerere-i';

const attrAliases = new Map<string,string>();
attrAliases.set(DOM_HIDDEN_ATTR, DOM_DYNAMIC_ATTR_PREFIX + JS_AUTOHIDE_CLASS);

export default class App {
	doc: HtmlDocument;
	nodes: Array<HtmlNode>;
	errors: Array<any>;
	root: Scope;

	constructor(doc:HtmlDocument, prepro?:Preprocessor) {
		this.doc = doc;
		this.nodes = [];
		this.errors = [];
		var root = doc.getFirstElementChild() as HtmlElement;
		this.root = this._loadScope(root, this._loadProps(root), 0, prepro);
		this._cleanupDom(root);
	}

	compile() {
		var sb = new StringBuf();
		this.root.output(sb);
		return sb.toString();
	}

	//TODO: forbid reserved props (__*)
	//TODO check aka, value names sanity
	_loadProps(e:HtmlElement): Map<string,Prop> {
		var ret = new Map<string,Prop>();
		for (var attr of e.attributes.values()) {
			var val = attr.quote == '['
				? DOM_EXP_MARKER1 + attr.value + DOM_EXP_MARKER2
				: attr.value;
			var key = attr.name;
			if (attrAliases.has(key)) {
				key = attrAliases.get(key) as string;
			}
			if (key.startsWith(DOM_DYNAMIC_ATTR_PREFIX)) {
				// e.domSet(key, null);
				//TODO: check key sanity
				if (key.startsWith(DOM_CLASS_ATTR_PREFIX)) {
					key = key.substr(DOM_CLASS_ATTR_PREFIX.length);
					key = JS_CLASS_VALUE_PREFIX + makeCamelName(key);
				} else if (key.startsWith(DOM_STYLE_ATTR_PREFIX)) {
					key = key.substr(DOM_STYLE_ATTR_PREFIX.length);
					key = JS_STYLE_VALUE_PREFIX + makeCamelName(key);
				} else if (key.startsWith(DOM_ATTR_ATTR_PREFIX)) {
					key = key.substr(DOM_ATTR_ATTR_PREFIX.length);
					key = JS_ATTR_VALUE_PREFIX + makeCamelName(key);
				} else if (key.startsWith(DOM_HANDLER_ATTR_PREFIX)) {
					key = key.substr(DOM_HANDLER_ATTR_PREFIX.length);
					key = JS_HANDLER_VALUE_PREFIX + makeCamelName(key);
				} else if (key.startsWith(DOM_EVENT_ATTR_PREFIX)) {
					key = key.substr(DOM_EVENT_ATTR_PREFIX.length);
					key = JS_EVENT_VALUE_PREFIX + makeCamelName(key);
				} else {
					key = key.substr(DOM_DYNAMIC_ATTR_PREFIX.length);
					key = makeCamelName(key);
				}
				ret.set(key, {key:key, val:val, pos:attr.pos2});
			} else if (val.indexOf(DOM_EXP_MARKER1) >= 0) {
				key = JS_ATTR_VALUE_PREFIX + makeCamelName(key);
				ret.set(key, {key:key, val:val, pos:attr.pos2});
			}
		}
		switch (e.name) {
			case 'HTML':
				ret.set(DOM_AKA_ATTR, {key:DOM_AKA_ATTR, val:'page', pos:e.pos});
				break;
			case 'HEAD':
				ret.set(DOM_AKA_ATTR, {key:DOM_AKA_ATTR, val:'head', pos:e.pos});
				break;
			case 'BODY':
				ret.set(DOM_AKA_ATTR, {key:DOM_AKA_ATTR, val:'body', pos:e.pos});
				break;
		}
		if (ret.has(DOM_AKA_ATTR)) {
			ret.set(JS_AKA_VAR, ret.get(DOM_AKA_ATTR) as Prop);
		}
		ret.delete(DOM_AKA_ATTR);
		if (ret.has(JS_DATA_VAR)) {
			ret.set(JS_AUTOHIDE_CLASS, {
				key: JS_AUTOHIDE_CLASS,
				val: `[[!${JS_DATA_VAR}]]`,
				pos: e.pos,
			});
		}
		return ret;
	}
	
	_loadScope(e:HtmlElement, props:Map<string,Prop>,
				nesting:number, prepro?:Preprocessor, parent?:Scope): Scope {
		var id = this.nodes.length;
		var aka = props.get(JS_AKA_VAR)?.val;
		var ret = new Scope(this, e, id, props, aka, prepro, parent);
		this.nodes.push(e);

		var that = this;
		function f(e:HtmlElement) {
			for (var n of e.children) {
				if (n.nodeType === ELEMENT_NODE) {
					var p = that._loadProps(n as HtmlElement);
					if (p.size > 0) {
						that._loadScope(n as HtmlElement, p, nesting + 1, prepro, ret);
					} else {
						f(n as HtmlElement);
					}
				} else if (n.nodeType === TEXT_NODE) {
					if ((n as HtmlText).nodeValue.indexOf(DOM_EXP_MARKER1) >= 0) {
						ret.texts.push(n as HtmlText);
					}
				}
			}
		}
		f(e);

		return ret;
	}

	_cleanupDom(e:HtmlElement) {
		function f(e:HtmlElement) {
			for (var key of e.attributes.keys()) {
				if (key.startsWith(DOM_DYNAMIC_ATTR_PREFIX)
					|| (e.getAttribute(key) as string).indexOf(DOM_EXP_MARKER1) >= 0) {
					e.setAttribute(key, undefined);
				}
			}
			for (var n of e.children) {
				if (n.nodeType === ELEMENT_NODE) {
					f(n as HtmlElement);
				}
			}
		}
		f(e);
	}

}

export class Scope {
	app: App;
	prepro?: Preprocessor;
	parent?: Scope;
	aka?: string;
	dom: HtmlElement;
	id: number;
	props: Map<string,Prop>;
	texts: Array<HtmlText>;
	values: Map<string,Prop>;
	references: Map<string, Set<string>>;
	children: Scope[];

	constructor(app:App, dom:HtmlElement, id:number, props:Map<string,Prop>,
				aka?:string, prepro?:Preprocessor, parent?:Scope) {
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
						this.values.set(key, prop);
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

interface ValueLink {
	observer: string,
	observed: string,
}

interface Prop {
	key: string,
	val: string,
	pos?: HtmlPos,
}

export class Value {
	scope: Scope;
	obj: ValueObj;

	constructor(scope:Scope, v:any) {
		this.scope = scope;
		this.obj = {v:v};
	}
}

export class AppError {
}
