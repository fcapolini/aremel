import { HtmlAttribute, HtmlComment, HtmlDocument, HtmlElement, HtmlText, VOID_ELEMENTS } from "./htmldom";

const ORIGIN_LITERAL = 'literal';
const SKIP_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE']);

export default class HtmlParser {
	origins: Array<string>;
	
	static parse(s:string): HtmlDocument {
		return new HtmlParser().parseDoc(s);
	}

	constructor() {
		this.origins = [];
	}

	parseDoc(s:string, fname?:string): HtmlDocument {
		fname = (fname ? fname : ORIGIN_LITERAL);
		var origin = this.origins.length;
		this.origins.push(fname);
		var ret = new HtmlDocument(origin);
		var i = this.parseNodes(ret, s, 0, origin);
		if (i < s.length) {
			new HtmlText(ret, ret, s.substr(i), i, s.length, origin);
		}
		return ret;
	}

	parseNodes(p:HtmlElement, s:string, i1:number, origin:number) {
		var i2, closure, i3 = i1, i4, closetag = null;
		while ((i2 = s.indexOf('<', i1)) >= 0) {
			i4 = i2;
			i1 = i2 + 1;
			(closure = s.charCodeAt(i1) == '/'.charCodeAt(0)) ? i1++ : null;
			if ((i2 = this.skipName(s, i1)) > i1) {
				if (i4 > i3) {
					new HtmlText(p.ownerDocument, p, s.substring(i3, i4),
								i3, i4, origin, false);
				}
				if (closure) {
					var name = s.substring(i1, i2).toUpperCase();
					if (s.charCodeAt(i2) == '>'.charCodeAt(0)) {
						if (name == p.tagName) {
							i1 = i2 + 1;
							closetag = name;
							break;
						} else {
							throw new HtmlException(
								`Found </${name}> instead of </${p.tagName}>`,
								this.origins[origin], i1, s
							);
						}
					} else {
						throw new HtmlException(
							'Unterminated close tag ' + name,
							this.origins[origin], i1, s
						);
					}
					i1 = i2;
				} else {
					i1 = this.parseElement(p, s, i1, i2, origin);
				}
				i3 = i1;
			} else if (!closure && (i2 = this.skipComment(s, i1, origin)) > i1) {
				if (i4 > i3) {
					new HtmlText(p.ownerDocument, p, s.substring(i3, i4),
								i3, i4, origin, false);
				}
				if (s.charCodeAt(i1 + 3) != '-'.charCodeAt(0)) {
					// if it doesn't start with `<!---`, store the comment
					//TODO: this may result in adjacent text nodes
					new HtmlComment(p.ownerDocument, p, s.substring(i1 - 1, i2),
									i1 - 1, i2, origin);
				}
				i3 = i1 = i2;
			}
		}
		if (!p.tagName.startsWith('#') && closetag !== p.tagName) {
			throw new HtmlException(`expected </${p.tagName}>`,
									this.origins[origin], i1, s);
		}
		return i1;
	}

	parseElement(p:HtmlElement, s:string,
				i1:number, i2:number, origin:number): number {
		var e = new HtmlElement(p.ownerDocument, p, s.substring(i1, i2), i1, i2, origin);
		i1 = this.parseAttributes(e, s, i2, origin);
		i1 = this.skipBlanks(s, i1);
		var selfclose = false;
		if ((selfclose = (s.charCodeAt(i1) == '/'.charCodeAt(0)))) {
			i1++;
		}
		if (s.charCodeAt(i1) != '>'.charCodeAt(0)) {
			throw new HtmlException(
				'Unterminated tag ${e.name}',
				this.origins[origin], i1, s
			);
		}
		i1++;
		if (!selfclose && !VOID_ELEMENTS.has(e.tagName)) {
			if (SKIP_CONTENT_TAGS.has(e.tagName)) {
				var res = this.skipContent(e.tagName, s, i1, origin);
				if (!res) {
					throw new HtmlException(
						'Unterminated tag ${e.name}',
						this.origins[origin], i1, s
					);
				}
				new HtmlText(e.ownerDocument, e, s.substring(i1, res.i0),
							i1, res.i0, origin, false);
				i1 = res.i2;
			} else {
				i1 = this.parseNodes(e, s, i1, origin);
			}
		}
		return i1;
	}

	parseAttributes(e:HtmlElement, s:string, i2:number, origin:number) {
		var i1 = this.skipBlanks(s, i2);
		while ((i2 = this.skipName(s, i1, true)) > i1) {
			//TODO: ignore `::<attributes>`, used for comments
			var name = s.substring(i1, i2);
			var a = e.setAttribute(name, '', undefined, i1, i2, origin);
			i1 = this.skipBlanks(s, i2);
			if (s.charCodeAt(i1) === '='.charCodeAt(0)) {
				i1 = this.skipBlanks(s, i1 + 1);
				var quote = s.charCodeAt(i1);
				if (a && (quote == '"'.charCodeAt(0) || quote == "'".charCodeAt(0))) {
					i1 = this.parseValue(a, s, i1 + 1, quote, String.fromCharCode(quote), origin);
			// #if (HTML_EXTENSIONS)
				} else if (a && (quote == '['.charCodeAt(0) && s.charCodeAt(i1 + 1) == '['.charCodeAt(0))) {
					i1 = this.parseValue(a, s, i1 + 2, quote, ']]', origin);
			// #end
				} else {
					// we don't support unquoted attribute values
					throw new HtmlException(
						'Missing attribute value', this.origins[origin], i1, s
					);
				}
			}
			i1 = this.skipBlanks(s, i1);
		};
		return i1;
	}

	parseValue(a:HtmlAttribute, s:string, i1:number,
						quote:number, term:string, origin:number) {
		var i2 = s.indexOf(term, i1);
		if (i2 < 0) {
			throw new HtmlException(
				'Unterminated attribute value',
				this.origins[origin], i1, s
			);
		} else {
			a.quote = String.fromCharCode(quote);
			var i = i2 + term.length;
			while (i < s.length && s.charCodeAt(i) == term.charCodeAt(0)) {
				i2++; i++;
			}
			a.value = s.substring(i1, i2);
			a.pos2 = {origin:origin, i1:i1, i2:i2};
			i1 = i2 + term.length;
		}
		return i1;
	}

	skipComment(s:string, i1:number, origin:number) {
		if (s.charCodeAt(i1) == '!'.charCodeAt(0)
			&& s.charCodeAt(i1 + 1) == '-'.charCodeAt(0)
			&& s.charCodeAt(i1 + 2) == '-'.charCodeAt(0)) {
			if ((i1 = s.indexOf('-->', i1 + 3)) < 0) {
				throw new HtmlException(
					'Unterminated comment',
					this.origins[origin], i1, s
				);
			}
			i1 += 3;
		}
		return i1;
	}

	skipContent(tag:string, s:string, i1:number, origin:number) {
		var i2;
		while ((i2 = s.indexOf('</', i1)) >= 0) {
			var i0 = i2;
			i1 = i2 + 2;
			i2 = this.skipName(s, i1);
			if (i2 > i1) {
				if (s.substring(i1, i2).toUpperCase() == tag) {
					i2 = this.skipBlanks(s, i2);
					if (s.charCodeAt(i2) != '>'.charCodeAt(0)) {
						throw new HtmlException(
							'Unterminated close tag',
							this.origins[origin], i1, s
						);
					}
					i2++;
					// break;
					return {i0: i0, i2: i2};
				}
			}
			i1 = i2;
		}
		return null;
	}

	skipBlanks(s:string, i:number) {
		while (i < s.length) {
			if (s.charCodeAt(i) > 32) {
				break;
			}
			i++;
		}
		return i;
	}

	skipName(s:string, i:number, acceptsDots=false) {
		while (i < s.length) {
			var code = s.charCodeAt(i);
			if ((code < 'a'.charCodeAt(0) || code > 'z'.charCodeAt(0)) &&
				(code < 'A'.charCodeAt(0) || code > 'Z'.charCodeAt(0)) &&
				(code < '0'.charCodeAt(0) || code > '9'.charCodeAt(0)) &&
				code != '-'.charCodeAt(0) && code != '_'.charCodeAt(0) &&
			// #if HTML_EXTENSIONS
				(!acceptsDots || code != '.'.charCodeAt(0)) &&
			// #end
				code != ':'.charCodeAt(0)) {
				break;
			}
			i++;
		}
		return i;
	}

}

export class HtmlException {
	msg: string;
	fname: string;
	pos: number;
	row: number;
	col: number;

	constructor(msg:string, fname:string, pos:number, s:string) {
		this.msg = msg;
		this.fname = fname;
		this.pos = pos;
		this.row = this.col = 1;
		var i = 0, j;
		while ((j = s.indexOf('\n', i)) >= 0 && (j <= pos)) {
			i = j + 1;
			this.row++;
		}
		this.col += (pos - Math.max(0, i));
	}

	toString() {
		return `${this.fname}:${this.row} col ${this.col}: ${this.msg}`;
	}
}
