import { JS_ATTR_VALUE_PREFIX, JS_CLASS_VALUE_PREFIX, JS_DATA_VAR, JS_STYLE_VALUE_PREFIX, nonValues } from "../compiler/app";
import { makeHyphenName } from "../compiler/util";
import { DomNode, DomElement, TEXT_NODE, DomTextNode, DomDocument } from "./dom";

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
	linkClass: (e:DomElement, n:string, o:ValueObj)=>ValueObj,
	linkStyle: (e:DomElement, n:string, o:ValueObj)=>ValueObj,
	linkAttr: (e:DomElement, n:string, o:ValueObj)=>ValueObj,
	linkHandler: (h:()=>void, o:ValueObj)=>void,
	tnode: (e:DomElement, n:string)=>any,
	// linkData: (v:any, o:ValueObj)=>ValueObj,
	// addRequest: (r:RequestObj)=>void,
	// requests: Array<RequestObj>,
	// JSON: {parse:(s:string)=>any, stringify:(o:any)=>string},
	// XML: {parse:(s:string)=>any, stringify:(o:any)=>string},
	// rgb: (c:string)=>string,
	// mixColors: (c1:string,c2:string,ratio:number)=>string,
	// elementIndex: (e:DomElement)=>number,
	// isLastElement: (e:DomElement)=>boolean,

	start: ()=>void;
	cb?: ()=>void,
	root?: any,
}

export interface PageObj {
	doc: DomDocument,
	nodes: Array<any>,
	script?: string,
}

export interface ValueObj {
	v: any,
	cycle?: number,
	fn?: ()=>any,
	observers?: Array<ValueObj>,
	callbacks?: Array<(v:any)=>any>,
}

export interface RequestObj {
	url: string,
	type: string,
	target: ValueObj,
	post?: boolean,
	scriptElement?: any,
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
		linkClass: linkClass,
		linkStyle: linkStyle,
		linkAttr: linkAttr,
		linkHandler: linkHandler,
		tnode: tnode,
		// linkData: linkData,
		// addRequest: addRequest,
		// requests: [],
		// JSON: {
		// 	parse: JSON.parse,
		// 	stringify: JSON.stringify,
		// },
		// XML: {
		// 	parse: (s) => Xml.parse(s),
		// 	stringify: (o) => o.toString(),
		// },
		// rgb: (color:string) => {
		// 	var rgba = ColorTools.color2Components(color);
		// 	return '${rgba.r}, ${rgba.g}, ${rgba.b}';
		// },
		// mixColors: (col1:string, col2:string, ratio:number) => {
		// 	return ColorTools.mix(col1, col2, ratio);
		// },
		// elementIndex: elementIndex,
		// isLastElement: (e:DomElement) => {
		// 	return elementIndex(e) >= (e.parentElement.childElementCount - 1);
		// },
		cb: cb,
		start: () => {
			link(runtime.links);
			runtime.links=[];
			refresh();
		},
	};

	function refresh() {
		runtime.cycle++;
		for (var i in runtime.values) {
			get(runtime.values[i]);
		}	
	}

	function add(o:any, k:string, v:ValueObj): ValueObj {
		runtime.values.push(v);
		if (k.startsWith(JS_CLASS_VALUE_PREFIX)) {
			linkClass(o.__dom, makeHyphenName(k.substr(JS_CLASS_VALUE_PREFIX.length)), v);
		} else if (k.startsWith(JS_STYLE_VALUE_PREFIX)) {
			linkStyle(o.__dom, makeHyphenName(k.substr(JS_STYLE_VALUE_PREFIX.length)), v);
		} else if (k.startsWith(JS_ATTR_VALUE_PREFIX)) {
			linkAttr(o.__dom, makeHyphenName(k.substr(JS_ATTR_VALUE_PREFIX.length)), v);
		} else if (k === JS_DATA_VAR) {
			// linkData(o, v);
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

	// function upd(value:ValueObj, incr:boolean, pre:boolean) {
	// 	//TODO
	// 	return value.v;
	// }

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
	
	function linkHandler(handler:()=>void, value:ValueObj) {
		addCallback(value, (v) => {
			handler();
			return v;
		});
	}

	function tnode(e:DomElement, path:string): DomTextNode | undefined {
		var ret:DomTextNode|undefined = undefined;
		var p = path.split('.');
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
		return (typeof v === 'string' && v != 'false')
				|| !(v == null || v == false || v == 'false');
	}

	function arrayRemove(a:Array<any>, e:any) {
		var i = a.indexOf(e);
		if (i >= 0) {
			a.splice(i, 1);
		}
	}

	return runtime;
}
