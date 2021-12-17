import { DomNode, DomNodeList } from "../shared/dom";
import HtmlParser from "./htmlparser";
import { normalizeSpace, StringBuf } from "../shared/util";

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

	constructor(doc:HtmlDocument|undefined, parent:HtmlElement|undefined,
				type:number, i1:number, i2:number, origin:number) {
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

	toString(sort=false, plain=false) {
		var sb = new StringBuf();
		this.output(sb, sort, plain);
		return sb.toString();
	}

	output(sb:StringBuf, sort:boolean, plain:boolean): StringBuf {
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

	classList: {add:(name:string)=>void, remove:(name:string)=>void};
	style: {setProperty:(k:string,v:string)=>void, removeProperty:(k:string)=>void};

	constructor(doc:HtmlDocument | undefined, parent:HtmlElement|undefined,
				name:string, i1:number, i2:number, origin:number) {
		super(doc, parent, ELEMENT_NODE, i1, i2, origin);
		this.tagName = name.toUpperCase();
		this.attributes = new Map();
		this.children = [];
		this.selfclose = false;
		var that = this;
		this.classList = {
			add: function(name:string) {
				var a = that.attributes.get('class') as HtmlClassAttribute;
				!a ? a = that.setAttribute('class', '') as HtmlClassAttribute : null;
				a.add(name);
			},
			remove: function(name:string) {
				var a = that.attributes.get('class') as HtmlClassAttribute;
				if (a) {
					a.remove(name);
				}
			}
		};
		this.style = {
			setProperty: function(k:string, v:string) {
				var a = that.attributes.get('style') as HtmlStyleAttribute;
				!a ? a = that.setAttribute('style', '') as HtmlStyleAttribute : null;
				a.setProperty(k, v);
			},
			removeProperty: function(k:string) {
				var a = that.attributes.get('style') as HtmlStyleAttribute;
				if (a) {
					a.removeProperty(k);
				}
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

	get firstChild(): any {
		return this.children.length > 0 ? this.children[0] : undefined;
	}

	get firstElementChild(): any {
		return this.getFirstElementChild();
	}

	get previousElementSibling(): any {
		if (this.parentElement) {
			var i = this.parentElement.children.indexOf(this);
			while (--i >= 0) {
				var sibling = this.parentElement.children[i];
				if (sibling.nodeType === ELEMENT_NODE) {
					return sibling;
				}
			}
		}
		return undefined;
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
				i1?:number, i2?:number, origin?:number): HtmlAttribute|undefined {
		var a = this.attributes.get(name);
		if (!a) {
			if (value != undefined) {
				if (name === 'class') {
					a = new HtmlClassAttribute(name, value, quote ? quote : '"',
							i1, i2, origin);
				} else if (name === 'style') {
					a = new HtmlStyleAttribute(name, value, quote ? quote : '"',
							i1, i2, origin);
				} else {
					a = new HtmlAttribute(name, value, quote ? quote : '"',
							i1, i2, origin);
				}
				this.attributes.set(name, a);
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
	}

	removeAttribute(name:string) {
		this.attributes.delete(name);
	}

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
				for (var child of this.children.slice()) {
					cb(child as DomNode, i++);
				}
			},
		}
	}

	get innerHTML() {
		var sb = new StringBuf();
		for (var i in this.children) {
			this.children[i].output(sb, false, true);
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
		this.output(sb, false, true);
		return sb.toString();
	}

	override output(sb:StringBuf, sort:boolean, plain:boolean): StringBuf {
		var name = this.tagName.toLowerCase();
		sb.add('<'); sb.add(name);

		this.outputAttributes(sb, sort, plain);

		if (this.isVoid()) {
			sb.add(' />');
		} else {
			sb.add('>');
			for (var i in this.children) {
				this.children[i].output(sb, sort, plain);
			}
			sb.add('</'); sb.add(name); sb.add('>');
		}
		return sb;
	}

	outputAttributes(sb:StringBuf, sort:boolean, plain:boolean) {
		var keys = this.getAttributeNames();
		if (sort) {
			keys = keys.sort((a, b) => (a > b ? 1 : (a < b ? -1 : 0)));
		}
		for (var key of keys) {
			var a = this.attributes.get(key);
			a?.output(sb, sort, plain);
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
	static escape(text:string, chars=""): string {
		var r = text;
		if (chars.indexOf('<') >= 0) r = r.split("<").join("&lt;");
		if (chars.indexOf('>') >= 0) r = r.split(">").join("&gt;");
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
		var ret = new HtmlElement(this, undefined, tagName, 0, 0, 0);
		return ret;
	}

	createTextNode(text:string): any {
		var ret = new HtmlText(this, undefined, text, 0, 0, 0, false);
		return ret;
	}

	override output(sb:StringBuf, sort:boolean, plain:boolean): StringBuf {
		for (var i in this.children) {
			this.children[i].output(sb, sort, plain);
		}
		return sb;
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

	override output(sb:StringBuf, sort:boolean, plain:boolean): StringBuf {
		sb.add(this.nodeValue
			? (this.escape ? htmlEscape(this.nodeValue) : this.nodeValue)
			: '');
		return sb;
	}
}

// https://www.w3docs.com/snippets/javascript/how-to-html-encode-a-string.html
function htmlEscape(str:string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/'/g, "&apos;")
		.replace(/"/g, '&quot;')
		.replace(/>/g, '&gt;')
		.replace(/</g, '&lt;');
}
function htmlUnescape(str: string): string {
	return str
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

export class HtmlComment extends HtmlNode {
	text: string;

	constructor(doc:HtmlDocument | undefined, parent:HtmlElement | undefined,
				text:string, i1:number, i2:number, origin:number) {
		super(doc, parent, COMMENT_NODE, i1, i2, origin);
		this.text = text;
	}

	override output(sb:StringBuf, sort:boolean, plain:boolean): StringBuf {
		if (this.text) {
			sb.add(this.text);
		}
		return sb;
	}
}

// =============================================================================
// HtmlAttribute
// =============================================================================

//TODO: value accessors aren't needed anymore
export class HtmlAttribute {
	name: string;
	_value: string;
	quote?: string;
	pos1?: HtmlPos;
	pos2?: HtmlPos;

	constructor(name:string, value:string, quote?:string,
				i1?:number, i2?:number, origin?:number) {
		this.name = name;
		this._value = value;
		this.quote = quote;
		if (origin && i1 && i2) {
			this.pos1 = {origin:origin, i1:i1, i2:i2};
		}
	}

	set value(v:string) {
		this._value = v;
	}

	get value(): string {
		return this._value;
	}

	output(sb:StringBuf, sort:boolean, plain:boolean) {
		sb.add(' '); sb.add(this.name);
		var outputValue = this.getOutputValue(sort, plain);
		if (outputValue !== '' || this.quote) {
			var q = this.quote === "'" ? "'" : '"';
			sb.add('='); sb.add(q);
			if (plain) {
				sb.add(HtmlElement.escape(outputValue, q));
			} else {
				sb.add(HtmlElement.escape(outputValue, "<>\r\n" + q));
			}
			sb.add(q);
		}
	}

	getOutputValue(sort:boolean, plain:boolean): string {
		return this.value;
	}
}

class HtmlClassAttribute extends HtmlAttribute {
	classes?: Set<string>;

	constructor(name:string, value:string, quote?:string,
				i1?:number, i2?:number, origin?:number) {
		super(name, value, quote, i1, i2, origin);
	}

	add(name:string) {
		!this.classes ? this.classes = new Set() : null;
		this.classes.add(name.trim());
	}

	remove(name:string) {
		this.classes ? this.classes.delete(name.trim()) : null;
	}

	override output(sb:StringBuf, sort:boolean, plain:boolean) {
		if (this.value != '' || (this.classes && this.classes.size > 0)) {
			super.output(sb, sort, plain);
		}
	}

	//TODO: sort
	override getOutputValue(sort:boolean, plain:boolean): string {
		var sb = new StringBuf();
		sb.add(this.value);
		if (!plain && this.classes) {
			for (var c of this.classes) {
				sb.add(' ');
				sb.add(c);
			}
		}
		return sb.toString().trim();
	}
}

class HtmlStyleAttribute extends HtmlAttribute {
	styles?: Map<string,string>;

	constructor(name:string, value:string, quote?:string,
				i1?:number, i2?:number, origin?:number) {
		super(name, value, quote, i1, i2, origin);
		this._value = '';
		this.value = value;
	}

	setProperty(k:string, v:string) {
		!this.styles ? this.styles = new Map() : null;
		v ? this.styles.set(k, v) : this.styles.delete(k);
	}

	removeProperty(k:string) {
		this.styles ? this.styles.delete(k.trim()) : null;
	}

	override output(sb:StringBuf, sort:boolean, plain:boolean) {
		if (this.value != '' || (this.styles && this.styles.size > 0)) {
			super.output(sb, sort, plain);
		}
	}

	//TODO: sort
	override getOutputValue(sort:boolean, plain:boolean): string {
		var sb = new StringBuf();
		var s = this.value.trim();
		if (s != '') {
			sb.add(s);
			!s.endsWith(';') ? sb.add(';') : null;
		}
		if (!plain && this.styles) {
			this.styles.forEach((v,k) => {
				sb.add(k); sb.add(':');
				sb.add(v); sb.add(';');
			});
		}
		return sb.toString().trim();
	}
}
