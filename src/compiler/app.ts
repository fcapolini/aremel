import { ValueObj } from "../shared/runtime";
import { ELEMENT_NODE, HtmlDocument, HtmlElement, HtmlNode, HtmlPos, HtmlText, TEXT_NODE } from "./htmldom";
import { makeCamelName, StringBuf } from "./util";

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
	root: Scope;

	constructor(doc:HtmlDocument) {
		this.doc = doc;
		this.nodes = [];
		var root = doc.getFirstElementChild() as HtmlElement;
		this.root = this._loadScope(root, this._loadProps(root), 0);
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
				nesting:number, parent?:Scope): Scope {
		var id = this.nodes.length;
		var aka = props.get(JS_AKA_VAR)?.val;
		var ret = new Scope(e, id, props, aka, parent);
		this.nodes.push(e);

		var that = this;
		function f(e:HtmlElement) {
			for (var n of e.children) {
				if (n.nodeType === ELEMENT_NODE) {
					var p = that._loadProps(n as HtmlElement);
					if (p.size > 0) {
						that._loadScope(n as HtmlElement, p, nesting + 1, ret);
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
	parent?: Scope;
	aka?: string;
	dom: HtmlElement;
	id: number;
	props: Map<string,Prop>;
	texts: Array<HtmlText>;
	children: Scope[];

	constructor(dom:HtmlElement, id:number, props:Map<string,Prop>, aka?:string, parent?:Scope) {
		if ((this.parent = parent)) {
			parent.children.push(this);
		}
		this.aka = aka;
		this.dom = dom;
		this.id = id;
		this.props = props;
		this.texts = [];
		this.children = [];
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
		//TODO
	}

	_outputTexts(sb:StringBuf) {
		//TODO
	}

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
