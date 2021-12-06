import { DomNode, DomNodeList } from "../shared/dom";
import HtmlParser from "./htmlparser";
import { StringBuf } from "./util";

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;

export interface HtmlPos {
	origin: number,
	i1: number,
	i2: number,
}

export class HtmlNode {
	ownerDocument: HtmlDocument | undefined;
	parentElement: HtmlElement | undefined;
	nodeType: number;
	pos: HtmlPos;

	constructor(doc:HtmlDocument|undefined, parent:HtmlElement|undefined, type:number, i1:number, i2:number, origin:number) {
		this.ownerDocument = doc;
		parent ? parent.addChild(this) : null;
		this.nodeType = type;
		this.pos = {origin:origin, i1:i1, i2:i2};
	}

	remove(): HtmlNode {
		if (this.parentElement) {
			var i = this.parentElement.children.indexOf(this);
			if (i >= 0) {
				this.parentElement.children.splice(i, 1);
			}
			this.parentElement = undefined;
		}
		return this;
	}

	toString(sort=false) {
		var sb = new StringBuf();
		this.output(sb, sort);
		return sb.toString();
	}

	output(sb:StringBuf, sort=false): StringBuf {
		return sb;
	}
}

// http://xahlee.info/js/html5_non-closing_tag.html
export const VOID_ELEMENTS = new Set(['AREA', 'BASE', 'BR', 'COL', 'EMBED',
	'HR', 'IMG', 'INPUT', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR',
	// obsolete
	'COMMAND', 'KEYGEN', 'MENUITEM'
]);

export class HtmlElement extends HtmlNode {
	tagName: string;
	attributes: Map<string, HtmlAttribute>;
	children: Array<HtmlNode>;
	selfclose: boolean;

	classList: {add:(name:string)=>void, remove:(name:string)=>void, classes?:Set<string>};
	// classAttr: Array<string> | undefined;
	style: {setProperty:(k:string,v:string)=>void, removeProperty:(k:string)=>void, styles?:Map<string,string>};

	constructor(doc:HtmlDocument | undefined, parent:HtmlElement|undefined, name:string, i1:number, i2:number, origin:number) {
		super(doc, parent, ELEMENT_NODE, i1, i2, origin);
		this.tagName = name.toUpperCase();
		this.attributes = new Map();
		this.children = [];
		this.selfclose = false;
		this.classList = {
			add: function(name:string) {
				!this.classes ? this.classes = new Set() : null;
				this.classes.add(name.trim());
			},
			remove: function(name:string) {
				this.classes ? this.classes.delete(name.trim()) : null;
			}
		};
		this.style = {
			setProperty: function(k:string, v:string) {
				!this.styles ? this.styles = new Map() : null;
				this.styles.set(k, v);
			},
			removeProperty: function(k:string) {
				this.styles ? this.styles.delete(k) : null;
			},
		}
	}

	appendChild(n:any) {
		this.addChild(n);
	}

	insertBefore(n:any, ref:any) {
		this.addChild(n, ref);
	}

	removeChild(n:DomNode) {
		(n as HtmlNode).remove();
	}

	addChild(child:HtmlNode, before?:HtmlNode) {
		child.parentElement = this;
		var i = before ? this.children.indexOf(before) : -1;
		if (i < 0) {
			this.children.push(child);
		} else {
			this.children.splice(i, 0, child);
		}
	}

	setAttribute(name:string, value?:string, quote?:string,
				i1?:number, i2?:number, origin?:number): HtmlAttribute | undefined {
		// if (name === 'class') {
		// 	this.setClassAttribute(value);
		// 	return undefined;
		// } else if (name === 'style') {
		// 	//TODO
		// 	return undefined;
		// } else {
			var a = this.attributes.get(name);
			if (!a) {
				if (value != undefined) {
					this.attributes.set(
						name,
						(a = new HtmlAttribute(name, value, quote ? quote : '"',
							i1, i2, origin))
					);
				}
			} else {
				if (value == undefined) {
					this.attributes.delete(name);
				} else {
					a.value = value;
					a.quote = quote ? quote : a.quote;
					if (i1 && i2 && origin) {
						a.pos1 = {origin:origin, i1:i1, i2:i2};
					}
				}
			}
			return a;
		// }
	}

	removeAttribute(name:string) {
		this.attributes.delete(name);
	}

	// setClassAttribute(value?:string) {
	// 	var cc = (value ? normalizeText(value).trim().split(' ') : []);
	// 	if (this.classAttr) {
	// 		for (var c of this.classAttr) {
	// 			if (cc.indexOf(c) < 0) {
	// 				this.classList.remove(c);
	// 			}
	// 		}
	// 	}
	// 	for (var c of cc) {
	// 		if (!this.classAttr || this.classAttr.indexOf(c) < 0) {
	// 			this.classList.add(c);
	// 		}
	// 	}
	// 	this.classAttr = cc;
	// 	return undefined;
	// }

	getAttribute(name:string): string | undefined {
		var a = this.attributes.get(name);
		return a?.value;
	}

	getAttributeNames(sort=false): Array<string> {
		var ret = new Array<string>();
		for (var key of this.attributes.keys()) {
			ret.push(key);
		}
		if (sort) {
			ret = ret.sort((a, b) => (a > b ? 1 : (a < b ? -1 : 0)));
		}
		return ret;
	}

	isVoid(): boolean {
		return VOID_ELEMENTS.has(this.tagName);
	}

	getFirstElementChild(): HtmlElement | undefined {
		for (var i in this.children) {
			var n = this.children[i];
			if (n.nodeType === ELEMENT_NODE) {
				return n as HtmlElement;
			}
		}
		return undefined;
	}

	get childNodes(): DomNodeList {
		return {
			length: this.children.length,
			item: (i) => {
				if (i >= 0 && i < this.children.length) {
					return (this.children[i] as DomNode);
				} else {
					return undefined;
				}
			},
			forEach: (cb) => {
				var i = 0;
				for (var child of this.children) {
					cb(child as DomNode, i++);
				}
			},
		}
	}

	get innerHTML() {
		var sb = new StringBuf();
		for (var i in this.children) {
			this.children[i].output(sb);
		}
		return sb.toString();
	}

	set innerHTML(s:string) {
		while (this.children.length > 0) {
			this.children[this.children.length - 1].remove();
		}
		var doc = HtmlParser.parse(s);
		for (var i in doc.children) {
			var c = doc.children[i];
			this.addChild(c);
		}
	}

	set innerText(s:string) {
		if (this.children.length == 1 && this.children[0].nodeType == TEXT_NODE) {
			(this.children[0] as HtmlText).nodeValue = s;
		} else {
			while (this.children.length > 0) {
				this.children[this.children.length - 1].remove();
			}
			new HtmlText(this.ownerDocument, this, s, 0, 0, 0);
		}
	}

	get outerHTML() {
		var sb = new StringBuf();
		this.output(sb);
		return sb.toString();
	}

	override output(sb:StringBuf, sort=false): StringBuf {
		var name = this.tagName.toLowerCase();
		sb.add('<'); sb.add(name);

		// var keys = this.getAttributeNames();

		// if (this.classList.classes && this.classList.classes.size > 0) {
		// 	var sep = '';
		// 	sb.add(' class="');
		// 	this.classList.classes.forEach((v) => {sb.add(sep + v); sep = '';});
		// 	sb.add('"');
		// }

		// if (this.style.styles && this.style.styles.size > 0) {
		// 	sb.add(' style="');
		// 	this.style.styles.forEach((v, k) => sb.add(k + ':' + v + ';'));
		// 	sb.add('"');
		// }

		// this.attributes.forEach((a) => {
		// 	if (a) {
		// 		sb.add(' '); sb.add(a.name);
		// 		if (a.value !== '' || a.quote) {
		// 			var q = a.quote === "'" ? "'" : '"';
		// 			sb.add('='); sb.add(q);
		// 			sb.add(this.escape(a.value, "\r\n" + q));
		// 			sb.add(q);
		// 		}
		// 	}
		// });

		this.outputAttributes(sb, sort);

		if (this.isVoid()) {
			sb.add(' />');
		} else {
			sb.add('>');
			for (var i in this.children) {
				this.children[i].output(sb, sort);
			}
			sb.add('</'); sb.add(name); sb.add('>');
		}
		return sb;
	}

	//TODO: handle both `:class-*` and `class` at the same time
	//TODO: handle both `:style-*` and `style` at the same time
	outputAttributes(sb:StringBuf, sort=false) {
		var keys = this.getAttributeNames();
		if (this.classList.classes && this.classList.classes.size > 0) {
			keys.indexOf('class') < 0 ? keys.push('class') : null;
		}
		if (this.style.styles && this.style.styles.size > 0) {
			keys.indexOf('style') < 0 ? keys.push('style') : null;
		}
		if (sort) {
			keys = keys.sort((a, b) => (a > b ? 1 : (a < b ? -1 : 0)));
		}
		for (var key of keys) {
			if (key === 'class' && this.classList.classes && this.classList.classes.size > 0) {
				var sep = '';
				sb.add(' class="');
				this.classList.classes.forEach((v) => {sb.add(sep + v); sep = '';});
				sb.add('"');
			} else if (key === 'style' && this.style.styles && this.style.styles.size > 0) {
				sb.add(' style="');
				this.style.styles.forEach((v, k) => sb.add(k + ':' + v + ';'));
				sb.add('"');
			} else {
				var a = this.attributes.get(key);
				if (a) {
					sb.add(' '); sb.add(a.name);
					if (a.value !== '' || a.quote) {
						var q = a.quote === "'" ? "'" : '"';
						sb.add('='); sb.add(q);
						sb.add(this.escape(a.value, "\r\n" + q));
						sb.add(q);
					}
				}
			}
		}
	}

	addEventListener(t:string, l:(ev:any)=>void) {
		// console.log(`${this.tagName}.addEventListener("${t}")`);
	}
	removeEventListener(t:string, l:(ev:any)=>void) {}

	// ===================================================================================
	// private
	// ===================================================================================

	// from haxe-htmlparser: htmlparser.HtmlTools.hx
	escape(text:string, chars=""): string {
		var r = text;
		r = r.split("<").join("&lt;");
		r = r.split(">").join("&gt;");
		if (chars.indexOf('"') >= 0) r = r.split('"').join("&quot;");
		if (chars.indexOf("'") >= 0) r = r.split("'").join("&apos;");
		if (chars.indexOf(" ") >= 0) r = r.split(" ").join("&nbsp;");
		if (chars.indexOf("\n") >= 0) r = r.split("\n").join("&#xA;");
		if (chars.indexOf("\r") >= 0) r = r.split("\r").join("&#xD;");
		return r;
	}
}

export class HtmlDocument extends HtmlElement {

	constructor(origin:number) {
		super(undefined, undefined, "#document", 0, 0, origin);
		this.ownerDocument = this;
		this.selfclose = true;
	}

	createElement(tagName:string): any {
		// constructor(doc:HtmlDocument | undefined, parent:HtmlElement|undefined, name:string, i1:number, i2:number, origin:number) {
		var ret = new HtmlElement(this, undefined, tagName, 1, 1, 0);
		return ret;
	}

	override output(sb:StringBuf, sort=false): StringBuf {
		for (var i in this.children) {
			this.children[i].output(sb, sort);
		}
		return sb;
	}
}

export class HtmlAttribute {
	name: string;
	value: string;
	quote?: string;
	pos1?: HtmlPos;
	pos2?: HtmlPos;

	constructor(name:string, value:string, quote?:string,
				i1?:number, i2?:number, origin?:number) {
		this.name = name;
		this.value = value;
		this.quote = quote;
		if (origin && i1 && i2) {
			this.pos1 = {origin:origin, i1:i1, i2:i2};
		}
	}	
}

export class HtmlText extends HtmlNode {
	escape: boolean;
	nodeValue: string;

	constructor(doc:HtmlDocument | undefined, parent:HtmlElement | undefined,
				text:string, i1:number, i2:number, origin:number, escape=true) {
		super(doc, parent, TEXT_NODE, i1, i2, origin);
		this.escape = escape;
		this.nodeValue = (escape ? htmlUnescape(text) : text);
	}

	override output(sb:StringBuf, sort=false): StringBuf {
		sb.add(this.nodeValue
			? (this.escape ? htmlEscape(this.nodeValue) : this.nodeValue)
			: '');
		return sb;
	}
}

// https://www.w3docs.com/snippets/javascript/how-to-html-encode-a-string.html
function htmlEscape(str:string): string {
	return str
		.replace(/&/g, '&')
		.replace(/'/g, "'")
		.replace(/"/g, '"')
		.replace(/>/g, '>')
		.replace(/</g, '<');
}
function htmlUnescape(str: string): string {
	return str
		.replace(/"/g, '"')
		.replace(/'/g, "'")
		.replace(/&/g, '&')
		.replace(/</g, '<')
		.replace(/>/g, '>');
}

export class HtmlComment extends HtmlNode {
	text: string;

	constructor(doc:HtmlDocument | undefined, parent:HtmlElement | undefined,
				text:string, i1:number, i2:number, origin:number) {
		super(doc, parent, COMMENT_NODE, i1, i2, origin);
		this.text = text;
	}

	override output(sb:StringBuf, sort=false): StringBuf {
		if (this.text) {
			sb.add(this.text);
		}
		return sb;
	}
}
