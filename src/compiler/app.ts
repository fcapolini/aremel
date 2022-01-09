import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import Showdown from 'showdown';
import hljs from 'highlight.js';
import { DomDocument } from "../shared/dom";
import { DOM_AKA_ATTR, DOM_ATTR_ATTR_PREFIX, DOM_CLASS_ATTR_PREFIX, DOM_DYNAMIC_ATTR_PREFIX, DOM_EVENT_ATTR_PREFIX, DOM_EXP_MARKER1, DOM_EXP_MARKER2, DOM_HANDLER_ATTR_PREFIX, DOM_HIDDEN_ATTR, DOM_STYLE_ATTR_PREFIX, JS_AKA_VAR, JS_ATTR_VALUE_PREFIX, JS_AUTOHIDE_CLASS, JS_CLASS_VALUE_PREFIX, JS_DATALENGTH_VAR, JS_DATAOFFSET_VAR, JS_DATA_VAR, JS_EVENT_VALUE_PREFIX, JS_HANDLER_VALUE_PREFIX, JS_STYLE_VALUE_PREFIX, PageObj, RequestObj, RuntimeWindow } from "../shared/runtime";
import { eregMap, makeCamelName, StringBuf } from "../shared/util";
import { AppScope } from "./appscope";
import { ELEMENT_NODE, HtmlDocument, HtmlElement, HtmlNode, HtmlPos, HtmlText, TEXT_NODE } from "./htmldom";
import Preprocessor from "./preprocessor";

export const nonValues = new Set([JS_AKA_VAR]);

const attrAliases = new Map<string,string>();
attrAliases.set(DOM_HIDDEN_ATTR, DOM_DYNAMIC_ATTR_PREFIX + JS_AUTOHIDE_CLASS);

export default class App {
	url: URL;
	doc: HtmlDocument;
	nodes: Array<HtmlNode>;
	scopes: Array<AppScope>;
	errors: Array<any>;
	root: AppScope;

	constructor(url:URL, doc:HtmlDocument, prepro?:Preprocessor) {
		this.url = url;
		this.doc = doc;
		this.nodes = [];
		this.scopes = [];
		this.errors = [];
		var root = doc.getFirstElementChild() as HtmlElement;
		var props = this._loadProps(root);
		this.root = this._loadScope(root, props, 0, prepro);
		this.root.compile();
		this._cleanupDom(root);
	}

	output(window?:RuntimeWindow): PageObj {
		var sb = new StringBuf();
		this.root.output(sb);

		// window object
		if (!window) {
			window = {
				addEventListener: (t:string, h:any) => {},
				removeEventListener: (t:string, h:any) => {},
				location: {toString:() => this.url.toString()},
				aremelEregMap: eregMap,
				showdown: Showdown,
				hljs: hljs,
			}
		}

		// return PageObj
		return {
			url: this.url,
			doc: this.doc as DomDocument,
			window: window,
			isClient: false,
			nodes: this.nodes,
			requester: App.requester,
			script: sb.toString()
		};
	}

	static requester(pageUrl:URL, req:RequestObj, cb:(s:string)=>void) {
		var base = `${pageUrl.protocol}//${pageUrl.hostname}`;
		pageUrl.port ? base += `:${pageUrl.port}` : null;
		//TODO: req.post
		//TODO: req.params
		try {
			var output = '';
			var url = new URL(req.url, base);
			console.log('requester(): "' + url + '"');
			function onData(r:any) {
				r.setEncoding('utf8');
				r.on('data', (chunk:string) => output += chunk);
				r.on('end', () => {
					cb(output);
				});
			}
			const r = url.protocol === 'https:'
				? httpsRequest(url, onData)
				: httpRequest(url, onData);
			r.on('error', e => {
				cb(`{"error":"${e}"}`);
			});
			r.end();
		} catch (ex:any) {
			cb(`{"error":"${ex}"}`);
		}
	}

	//TODO: forbid reserved props (__*)
	//TODO check aka, value names sanity
	_loadProps(e:HtmlElement): Map<string,Prop> {
		var ret = new Map<string,Prop>();
		for (var attr of e.attributes.values()) {
			var val = attr.quote === '['
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
		switch (e.tagName) {
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
				// https://stackoverflow.com/a/15992131
				val: `[[(${JS_DATA_VAR}) == null]]`,
				pos: e.pos,
			});
			if (!ret.has(JS_DATAOFFSET_VAR)) {
				ret.set(JS_DATAOFFSET_VAR, {key:JS_DATAOFFSET_VAR, val:'[[0]]', pos:e.pos});
			}
			if (!ret.has(JS_DATALENGTH_VAR)) {
				ret.set(JS_DATALENGTH_VAR, {key:JS_DATALENGTH_VAR, val:'[[-1]]', pos:e.pos});
			}
		}
		return ret;
	}
	
	_loadScope(e:HtmlElement, props:Map<string,Prop>,
				nesting:number, prepro?:Preprocessor, parent?:AppScope): AppScope {
		var id = this.nodes.length;
		var ret = new AppScope(this, id, e, props, prepro, parent);
		this.nodes.push(e);
		this.scopes.push(ret);

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
						ret.texts.push(n as any);
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

export interface Prop {
	key: string,
	val: string,
	pos?: HtmlPos,
}

export class AppError {
}
