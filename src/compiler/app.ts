import { PageObj, RuntimeObj, ValueObj } from "../shared/runtime";
import { HtmlDocument, HtmlElement, HtmlNode, HtmlPos, ELEMENT_NODE, TEXT_NODE, HtmlText } from "./htmldom";
import { makeCamelName } from "./util";

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
		this.root = this.loadScope(root, this.loadProps(root), 0);
		this.cleanupDom(root);
	}

	//TODO: forbid reserved props (__*)
	loadProps(e:HtmlElement): Map<string,Prop> {
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
	
	loadScope(e:HtmlElement, props:Map<string,Prop>,
				nesting:number, parent?:Scope): Scope {
		var id = this.nodes.length;
		var ret = new Scope(e, id, props, parent);
		this.nodes.push(e);

		var that = this;
		function f(e:HtmlElement) {
			for (var n of e.children) {
				if (n.nodeType === ELEMENT_NODE) {
					var p = that.loadProps(e);
					if (p.size > 0) {
						that.loadScope(n as HtmlElement, p, nesting + 1, ret);
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

	cleanupDom(e:HtmlElement) {
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
	dom: HtmlElement;
	id: number;
	props: Map<string,Prop>;
	texts: Array<HtmlText>;
	children: Scope[];

	constructor(dom:HtmlElement, id:number, props:Map<string,Prop>, parent?:Scope) {
		if ((this.parent = parent)) {
			parent.children.push(this);
		}
		this.dom = dom;
		this.id = id;
		this.props = props;
		this.texts = [];
		this.children = [];
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
