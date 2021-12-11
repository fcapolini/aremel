import { makeHyphenName } from "./util";
import { DomDocument, DomElement, DomNode, DomTextNode, ELEMENT_NODE, TEXT_NODE } from "./dom";
import { color2Components, mixColors } from "./color";

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
export const JS_TEXT_VALUE_PREFIX = 'text_';
export const JS_EVENT_VALUE_PREFIX = 'event_';
export const JS_NOTNULL_FN = '__nn';
export const JS_DATA_VAR = 'data';
export const JS_DATAOFFSET_VAR = 'dataOffset';
export const JS_DATALENGTH_VAR = 'dataLength';
export const JS_AUTOHIDE_CLASS = JS_CLASS_VALUE_PREFIX + '__aremelAutohide';
export const CSS_AUTOHIDE_CLASS = '__aremel-autohide';
export const DOM_ID_ATTR = 'data-aremel';
export const DOM_CLONEINDEX_ATTR = 'data-aremel-i';

export interface RuntimeEventSource {
	addEventListener: (t:string,h:any)=>void,
	removeEventListener: (t:string,h:any)=>void,
}

// export interface RuntimeHttpRequester {
// 	request: (url:string, type:string, post:boolean, cb:(s:string)=>void)=>void
// }

export interface RuntimeObj {
	page: PageObj,
	cycle: number,
	pushLevel: number,
	values: Array<ValueObj>,
	links: Array<{o:ValueObj, v:()=>ValueObj}>,
	evhandlers: Array<{e:DomElement, t:string, h:(v:any)=>void}>,
	add: (o:any, k:string, v:ValueObj)=>ValueObj,
	get: (o:ValueObj)=>any,
	set: (o:ValueObj, v:any)=>any,
	tnode: (e:DomElement, n:string)=>any,

	addRequest: (r:RequestObj)=>void,
	requests: Array<RequestObj>,

	rgb: (c:string)=>string,
	mixColors: (c1:string,c2:string,ratio:number)=>string,
	elementIndex: (e:DomElement)=>number,
	isLastElement: (e:DomElement)=>boolean,

	start: ()=>void;
	cb?: ()=>void,
	root?: any,
}

export interface PageObj {
	doc: DomDocument,
	window: RuntimeEventSource,
	nodes: Array<any>,
	requester: (req:RequestObj, cb:(s:string)=>void)=>void,
	script?: string,
}

export interface ValueObj {
	v: any,
	cycle?: number,
	fn?: ()=>any,
	observers?: Array<ValueObj>,
	callbacks?: Array<(v:any)=>any>,
	// k?: string,
}

export interface RequestObj {
	url: string,
	post?: boolean,
	type: string,
	target: ValueObj,
	scriptElement?: DomElement,
}

export function make(page:PageObj, cb?:()=>void): RuntimeObj {
	var runtime = {
		page: page,
		cycle: 0,
		pushLevel: 0,
		values: new Array(),
		links: [],
		evhandlers: [],
		add: add,
		get: get,
		set: set,
		tnode: tnode,

		addRequest: addRequest,
		requests: new Array<RequestObj>(),

		rgb: (color:string) => {
			var rgba = color2Components(color);
			return rgba ? `${rgba.r}, ${rgba.g}, ${rgba.b}` : '#000';
		},
		mixColors: (col1:string, col2:string, ratio:number) => {
			return mixColors(col1, col2, ratio);
		},
		
		elementIndex: elementIndex,
		isLastElement: (e:DomElement) => {
			return e.parentElement
				? elementIndex(e) >= (e.parentElement.childElementCount - 1)
				: true
		},

		cb: cb,
		start: () => {
			link(runtime.links);
			runtime.links=[];
			addEvHandlers(runtime.evhandlers);
			refresh();
			if (runtime.requests.length < 1 && cb) {
				// cb();
				setTimeout(cb, 0);
			}
		},
	};

	function refresh() {
		runtime.cycle++;
		for (var i in runtime.values) {
			get(runtime.values[i]);
		}	
	}

	function add(o:any, k:string, v:ValueObj): ValueObj {
		// v.k = k;
		runtime.values.push(v);
		if (k.startsWith(JS_CLASS_VALUE_PREFIX)) {
			linkClass(o.__dom, makeHyphenName(k.substr(JS_CLASS_VALUE_PREFIX.length)), v);
		} else if (k.startsWith(JS_STYLE_VALUE_PREFIX)) {
			linkStyle(o.__dom, makeHyphenName(k.substr(JS_STYLE_VALUE_PREFIX.length)), v);
		} else if (k.startsWith(JS_ATTR_VALUE_PREFIX)) {
			linkAttr(o.__dom, makeHyphenName(k.substr(JS_ATTR_VALUE_PREFIX.length)), v);
		} else if (k.startsWith(JS_TEXT_VALUE_PREFIX)) {
			linkText(o.__dom, k.substr(JS_ATTR_VALUE_PREFIX.length), v);
		} else if (k === JS_DATA_VAR) {
			linkData(o, v);
		}
		return v;
	}

	function get(value:ValueObj) {
		var first = (value.cycle == null);
		var ret = value.v;
		if (value.cycle != runtime.cycle) {
			value.cycle = runtime.cycle;
			if (value.fn != null) {
				try {
					value.v = value.fn();
				} catch (ignored:any) {
					//FIXME: log runtime errors
				}
			}
			if (!areEqual(value.v, ret)) {
				handle(value);
				ret = value.v;
				if (value.observers != null) {
					for (var i in value.observers) {
						var o = value.observers[i];
						try {
							get(o);
						} catch (ignored:any) {}
					}
				}
			} else if (first) {
				handle(value);
				ret = value.v;
			}
		}
		return ret;
	}

	function set(value:ValueObj, v:any) {
		value.fn = undefined;
		if (!areEqual(value.v, v)) {
			value.v = v;
			handle(value);
			if (value.observers) {
				if (runtime.pushLevel < 1) {
					runtime.cycle++;
				}
				runtime.pushLevel++;
				for (var i in value.observers) {
					var o = value.observers[i];
					try {
						get(o);
					} catch (ignored:any) {}
				}
				runtime.pushLevel--;
			}
		}
		return value.v;
	}

	function handle(value:ValueObj) {
		if (value.callbacks != null) {
			for (var i in value.callbacks) {
				var c = value.callbacks[i];
				try {
					value.v = c(value.v);
				} catch (ignored:any) {}
			}
		}
	}

	function linkClass(dom:DomElement, name:string, value:ValueObj) {
		addCallback(value, (v) => {
			isTrue(v) ? dom.classList.add(name) : dom.classList.remove(name);
			return v;
		});
		return value;
	}

	function linkStyle(dom:DomElement, name:string, value:ValueObj) {
		addCallback(value, (v) => {
			v !== null && v != undefined
				? dom.style.setProperty(name, '' + v)
				: dom.style.removeProperty(name);
			return v;
		});
		return value;
	}

	function linkAttr(dom:DomElement, name:string, value:ValueObj) {
		addCallback(value, (v) => {
			v !== null && v != undefined
				? dom.setAttribute(name, '' + v)
				: dom.removeAttribute(name);
			return v;
		});
		return value;
	}
	
	function linkText(dom:DomElement, name:string, value:ValueObj) {
		var node = tnode(dom, name);
		addCallback(value, (v) => {
			node ? node.nodeValue = (v ? '' + v : '') : null;
		});
		return value;
	}

	function linkData(that:any, value:ValueObj) {

		function cloneSelf(i:number, data:any, dom?:DomElement): any {
			var ret = null;
			var nodes = new Map<String, DomElement>();
			var links = new Array<{o:ValueObj, v:()=>ValueObj}>();
			var evs = new Array<{e:DomElement,t:string,h:(v:any)=>void}>();
			function __add(o:any, k:string, v:ValueObj) {return runtime.add(o, k, v);}
			function __link(l:any) {links.push(l);}
			function __ev(h:{e:DomElement,t:string,h:(v:any)=>void}) {evs.push(h);}
			function __node(id:number) {return nodes.get(`${id}`);}
			if (that.__self) {
				if (!dom) {
					// clone DOM
					var src:DomElement = that.__dom;
					var html = src.outerHTML;
					var wrapper = runtime.page.doc.createElement('div');
					wrapper.innerHTML = html;
					dom = wrapper.firstElementChild as DomElement;
					dom.setAttribute(DOM_CLONEINDEX_ATTR, `${i}`);
					src.parentElement?.insertBefore(dom, src);
				}
				// collect nodes
				function f(e:DomElement) {
					var id = e.getAttribute(DOM_ID_ATTR);
					id ? nodes.set(id, e) : null;
					e.childNodes.forEach((n, i) => {
						if (n.nodeType === ELEMENT_NODE) {
							f(n as DomElement);
						}
					});
				}
				f(dom);
				// clone scope
				var vv = runtime.values;
				runtime.values = [];
				ret = that.__self(that.__outer, {v:data},
						__add, __link, __ev, __node, undefined);
				ret.__values = runtime.values;
				ret.__links = links;
				ret.__evs = evs;
				ret.__isClone = true;
				runtime.values = vv;
				link(links);
				addEvHandlers(evs);
				// refresh clone
				for (var v of ret.__values) {
					get(v);
				}	
			}
		return ret;
		}

		function remove(that:any) {
			var e:DomElement = that.__dom;
			e.parentElement?.removeChild(e);
			unlink(that.__links);
			removeEvHandlers(that.__evs);
		}

		addCallback(value, (v) => {
			if (that.__isClone) {
				// a clone cannot directly handle further replication
				return v;
			}

			var ret = v;
			var clone:any;
			var siblings; // possible pre-existing server-side clones
			var sibling;
			var count = 0;

			if (!that.__clones) {
				that.__clones = [];
				siblings = new Map<number,DomElement>();
				var cloneId;
				sibling = that.__dom?.previousElementSibling;
				while (sibling && (cloneId = sibling.getAttribute(DOM_CLONEINDEX_ATTR))) {
					siblings.set(parseInt(cloneId), sibling);
					sibling = sibling.previousElementSibling;
				}
			}

			if (Array.isArray(v)) {

				var offset = that[JS_DATAOFFSET_VAR];
				var length = that[JS_DATALENGTH_VAR];
				if (offset || length) {
					!offset ? offset = 0 : null;
					length && length < 0 ? length = undefined : null;
					!length ? length = v.length : Math.max(0, v.length - offset);
					v = v.slice(offset, offset + length);
				}

				count = Math.max(v.length - 1, 0);
				for (var i = 0; i < count; i++) {
					if (i < that.__clones.length) {
						// update existing clones
						clone = that.__clones[i];
						set(clone.__value_data, v[i]);
					} else {
						// create missing clones
						clone = cloneSelf(i, v[i], siblings?.get(i));
						that.__clones.push(clone);
					}
				}

				// remove exeeding clones
				while (that.__clones.length > count) {
					clone = that.__clones.pop();
					remove(clone);
				}

				// make original node display last data element
				ret = (v.length > 0 ? v[v.length - 1] : null);

			} else if (that.__clones) {
				for (clone of that.__clones) {
					remove(clone);
				}
			}

			// remove possible unused server-side clones from the DOM
			if (siblings) {
				siblings.forEach((e, i) => {
					if (i >= count) {
						e.parentElement?.removeChild(e);
					}
				});
			}

			return ret;
		});
		return value;
	}

	function addRequest(r:RequestObj) {
		function res(s:string) {
			try {
				if (r.scriptElement) {
					var t = r.scriptElement.firstChild;
					if (t) {
						(t as DomTextNode).nodeValue = s;
					} else {
						t = r.scriptElement.ownerDocument?.createTextNode(s);
						r.scriptElement.appendChild(t as DomNode);
					}
				}
				if (r.type === 'text/json') {
					set(r.target, JSON.parse(s));
				} else {
					set(r.target, s);
				}
			} catch (ex:any) {
				//TODO
			}

			var i = runtime.requests.indexOf(r);
			if (i >= 0) {
				runtime.requests.splice(i, 1);
			}
			if (runtime.requests.length < 1 && runtime.cb) {
				setTimeout(runtime.cb, 0);
			}
		}

		if (r.url) {
			runtime.requests.push(r);
			runtime.page.requester(r, res);
		}
	}

	function tnode(e:DomElement, path:string): DomTextNode | undefined {
		var ret:DomTextNode|undefined = undefined;
		var p = path.split('_');
		for (var i in p) {
			var v = p[i];
			var n = e.childNodes.item(parseInt(v));
			if (n?.nodeType === TEXT_NODE) {
				ret = n as DomTextNode;
				break;
			}
			if (!(e = n as DomElement)) {
				break;
			}
		}
		return ret;
	}

	function link(links:Array<{o:ValueObj, v:()=>ValueObj}>) {
		function __link(v1:ValueObj, v2:ValueObj) {
			if (v1 != null && v2 != null) {
				if (v2.observers != null) v2.observers.push(v1);
				else v2.observers = [v1];
			}
		}
		for (var i in links) {
			var l = links[i];
			try {
				__link(l.o, l.v());
			} catch (ignored:any) {}
		}
	}

	function unlink(links:Array<{o:ValueObj, v:()=>ValueObj}>) {
		function __unlink(v1:ValueObj, v2:ValueObj) {
			if (v1 != null && v2 != null) {
				if (v2.observers != null) arrayRemove(v2.observers, v1);
			}
		}
		for (var i in links) {
			var l = links[i];
			try {
				__unlink(l.o, l.v());
			} catch (ignored:any) {}
		}
	}

	function elementIndex(e:DomElement): number {
		var ret = -1;
		e.parentElement?.childNodes.forEach((n:DomNode, i:number) => {
			if (n === e) {
				ret = i;
			}
		});
		return ret;
	}

	function addEvHandlers(handlers:Array<{e:DomElement,t:string,h:(v:any)=>void}>) {
		for (var i in handlers) {
			var h = handlers[i];
			h.e.addEventListener(h.t, h.h);
		}
	}

	function removeEvHandlers(handlers:Array<{e:DomElement,t:string,h:(v:any)=>void}>) {
		for (var i in handlers) {
			var h = handlers[i];
			h.e.removeEventListener(h.t, h.h);
		}
	}

	function addCallback(value:ValueObj, cb:(v:any)=>any) {
		value.callbacks != null ? value.callbacks.push(cb) : value.callbacks = [cb];
	}

	function areEqual(a:any, b:any) {
		return (a != null ? a == b : b == null);
	}

	function isTrue(v:any): boolean {
		return (typeof v === 'string' && v !== 'false')
				|| !(v === null || v === false || v === 'false');
	}

	function arrayRemove(a:Array<any>, e:any) {
		var i = a.indexOf(e);
		if (i >= 0) {
			a.splice(i, 1);
		}
	}

	return runtime;
}
