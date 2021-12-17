import fs from "fs";
import path from "path";
import { ELEMENT_NODE, TEXT_NODE, HtmlDocument, HtmlElement, HtmlNode, HtmlPos, HtmlText } from "./htmldom";
import HtmlParser, { HtmlException } from "./htmlparser";

const INCLUDE_TAG = ':INCLUDE';
const IMPORT_TAG = ':IMPORT';
const INCLUDE_ARG = 'src';

const DEFINE_TAG = ':DEFINE';
const DEFINE_ARG = 'tag';
const SLOT_TAG = ':SLOT';
const SLOT_ARG = 'name';
const SLOT_ATTR = ':slot';

interface Definition {
	name1: string,
	name2: string,
	e: HtmlElement,
	ext?: Definition,
}

export interface SourcePos {
	fname: string,
	line: number,
	col: number,
}

export default class Preprocessor {
	rootPath: string;
	parser: HtmlParser;
	sources: Array<string>;
	macros: Map<string, Definition>;

	constructor(rootPath:string) {
		this.rootPath = rootPath;
		this.parser = new HtmlParser();
		this.sources = [];
		this.macros = new Map();
	}

	read(fname:string, embeddedInclude?:string): HtmlDocument | undefined {
		if (this.sources.length > 0
				|| this.macros.size > 0
				|| this.parser.origins.length > 0) {
			this.sources = [];
			this.macros = new Map();
			this.parser.origins = [];
		}
		var ret = this.readFile(fname);
		if (ret) {
			if (embeddedInclude != null) {
				domEnsureHeadAndBody(ret);
				var head = ret ? domGetTop(ret, 'HEAD') : undefined;
				if (head) {
					var inc = this.parser.parseDoc(embeddedInclude, 'embedded');
					this.include(inc.firstElementChild, head as HtmlElement, undefined);
					this.joinAdjacentTexts(head);
				}
			}
			this.processMacros(ret);
		}
		return ret;
	}

	getOrigin(i:number): string {
		var fname = (i >= 0 && i < this.parser.origins.length
				? this.parser.origins[i]
				: '');
		fname.startsWith(this.rootPath)
				? fname = fname.substr(this.rootPath.length)
				: null;
		return fname;
	}

	getSourcePos(htmlPos:HtmlPos): SourcePos | undefined {
		var ret:SourcePos|undefined = undefined;
		var fname = this.getOrigin(htmlPos.origin);
		if (fname != null) {
			ret = {fname:fname, line:1, col:1};
			var src = this.sources[htmlPos.origin], i = 0, j;
			while ((j = src.indexOf('\n', i)) >= 0) {
				if (j > htmlPos.i1) {
					break;
				}
				i = j;
				ret.line++;
			}
			ret.col = Math.max(0, (htmlPos.i1 - i) + 1);
		}
		return ret;
	}

	// =========================================================================
	// includes
	// =========================================================================

	readFile(fname:string,
			currPath?:string,
			once=false,
			includedBy?:HtmlElement): HtmlDocument | undefined {
		var ret:HtmlDocument;
		fname.startsWith('/') ? currPath = undefined : null;
		!currPath ? currPath = this.rootPath : null;
		var filePath = path.normalize(path.join(currPath, fname));
		currPath = path.dirname(filePath);
		if (!filePath.startsWith(this.rootPath)) {
			throw new PreprocessorError(`Forbidden file path "${fname}"`);
		}
		if (once && this.parser.origins.indexOf(filePath) >= 0) {
			return undefined;
		}
		var text;
		try {
			text = fs.readFileSync(filePath, {encoding: 'utf8'});
		} catch (ex:any) {
			var msg = `Could not read file "${fname}"`;
			var f = (includedBy
					? this.parser.origins[includedBy.pos.origin]
					: undefined);
			var pos = (includedBy ? includedBy.pos.i1 : undefined);
			throw new PreprocessorError(msg, f, this.rootPath, pos);
		}
		var extension = path.extname(filePath).toLowerCase();
		if (extension === '.html' || extension === '.htm') {
			// module inclusion
			try {
				this.sources.push(text);
				ret = this.parser.parseDoc(text, filePath);
				this.processIncludes(ret, currPath);
			} catch (ex:any) {
				if (ex instanceof HtmlException) {
					throw new PreprocessorError(ex.msg, ex.fname, this.rootPath,
							ex.pos, ex.row, ex.col);
				}
				if (ex instanceof PreprocessorError) {
					throw ex;
				}
				throw new PreprocessorError('' + ex);
			}
		} else {
			// textual inclusion
			var origin = this.parser.origins.length;
			this.sources.push(text);
			this.parser.origins.push(filePath);
			ret = new HtmlDocument(origin);
			var root = new HtmlElement(ret.ownerDocument, ret, 'lib',
					0, 0, origin);
			new HtmlText(root.ownerDocument, root, text, 0, 0, origin);
		}
		return ret;
	}

	processIncludes(doc:HtmlDocument, currPath:string) {
		var tags = new Set([INCLUDE_TAG, IMPORT_TAG]);
		// tags.add(INCLUDE_TAG);
		// tags.add(IMPORT_TAG);
		var includes = this.lookupTags(doc, tags);
		for (var e of includes) {
			var src = e.getAttribute(INCLUDE_ARG);
			if (src && (src = src.trim()).length > 0) {
				this.processInclude(e, src, e.tagName === IMPORT_TAG, currPath);
			} else {
				throw new HtmlException(
					'Missing "src" attribute', this.parser.origins[e.pos.origin],
					e.pos.i1, this.sources[e.pos.origin]
				);
			}
		}
	}

	processInclude(e:HtmlElement, src:string, once:boolean, currPath:string) {
		var parent = e.parentElement;
		var before = undefined;
		if (parent) {
			var i = parent.children.indexOf(e) + 1;
			before = (i < parent.children.length ? parent.children[i] : undefined);
			e.remove();
			var doc = this.readFile(src, currPath, once, e);
			if (doc != null) {
				var root = doc.getFirstElementChild();
				if (root) {
					this.include(root, parent, before);
				}
			}
			this.joinAdjacentTexts(parent);
		}
	}

	include(root:HtmlElement, parent:HtmlElement, before?:HtmlNode) {
		for (var n of root.children.slice()) {
			parent.addChild(n.remove(), before);
		}
		// cascade root attributes
		for (var k of root.attributes.keys()) {
			if (!parent.attributes.has(k)) {
				var a = root.attributes.get(k);
				if (a) {
					parent.attributes.set(k, a);
				}
			}
		}
	}

	// =========================================================================
	// macros
	// =========================================================================

	processMacros(doc:HtmlDocument) {
		this.collectMacros(doc);
		this.expandMacros(doc);
	}

	// -------------------------------------------------------------------------
	// collect
	// -------------------------------------------------------------------------

	collectMacros(p:HtmlElement) {
		var tags = new Set<string>();
		tags.add(DEFINE_TAG);
		var macros = this.lookupTags(p, tags);
		for (var e of macros) {
			this.collectMacro(e);
		}
	}

	collectMacro(e:HtmlElement) {
		var tag = e.getAttribute(DEFINE_ARG);
		if (!tag || (tag = tag.trim()).length === 0) {
			throw new HtmlException(
				this.parser.origins[e.pos.origin], 'Missing "tag" attribute',
				e.pos.i1, this.sources[e.pos.origin]
			);
		}
		var columnPrefix = tag.startsWith(':');
		columnPrefix ? tag = tag.substr(1) : null;
		var names = tag.split(':');
		names.length < 2 ? names.push('div') : null;
		if (!/^[_a-zA-Z0-9]+-[-:_a-zA-Z0-9]+$/.test(names[0])
			|| !/^[-_a-zA-Z0-9]+$/.test(names[1])) {
			throw new HtmlException(
				this.parser.origins[e.pos.origin],
				'Bad "tag" attribute (missing "-" in custom tag name)',
				e.pos.i1, this.sources[e.pos.origin]
			);
		}
		columnPrefix ? names[0] = ':' + names[0] : null;
		names[0] = names[0].toUpperCase();
		names[1] = names[1].toUpperCase();
		var parent = e.parentElement;
		if (parent) {
			e.remove();
			this.joinAdjacentTexts(parent);
		}
		e.setAttribute(DEFINE_ARG, undefined);
		this.expandMacros(e);
		this.macros.set(names[0], {
			name1: names[0],
			name2: names[1],
			e: e,
			ext: this.macros.get(names[1])
		});
	}

	collectSlots(p:HtmlElement) {
		var ret = new Map<string, HtmlElement>();
		var tags = new Set<string>();
		tags.add(SLOT_TAG);
		var slots = this.lookupTags(p, tags);
		for (var e of slots) {
			var s = e.getAttribute(SLOT_ARG);
			var names = (s ? s.split(',') : undefined);
			if (names) {
				for (var i in names) {
					var name = names[i];
					if ((name = name.trim()).length < 1
						|| ret.has(name)) {
						throw new HtmlException(
							this.parser.origins[e.pos.origin],
							'Bad/duplicated "name" attribute',
							e.pos.i1, this.sources[e.pos.origin]
						);
					}
					ret.set(name, e);
				}
			}
		}
		if (!ret.has('default')) {
			var e = new HtmlElement(p.ownerDocument, p, SLOT_TAG,
					p.pos.i1, p.pos.i2, p.pos.origin);
			e.setAttribute(SLOT_ARG, 'default');
			ret.set('default', e);
		}
		return ret;
	}

	// -------------------------------------------------------------------------
	// expand
	// -------------------------------------------------------------------------

	expandMacros(p:HtmlElement) {
		var that = this;
		function f(p:HtmlElement) {
			var ret = false;
			for (var n of p.children.slice()) {
				if (n.nodeType === ELEMENT_NODE) {
					var name = (n as HtmlElement).tagName;
					var def = that.macros.get(name);
					if (def != null) {
						var e = that.expandMacro(n as HtmlElement, def);
						p.addChild(e, n);
						n.remove();
						ret = true;
					} else {
						that.expandMacros(n as HtmlElement);
					}
				}
			}
			return ret;
		}
		if (f(p)) {
			this.joinAdjacentTexts(p);
		}
	}

	expandMacro(use:HtmlElement, def:Definition): HtmlElement {
		var ret = null;
		if (def.ext != null) {
			var e = new HtmlElement(def.e.ownerDocument, undefined, def.e.tagName,
					use.pos.i1, use.pos.i2, use.pos.origin);
			for (var a of def.e.attributes.values()) {
				var a2 = e.setAttribute(a.name, a.value, a.quote,
						a.pos1?.i1, a.pos1?.i2, a.pos1?.origin);
				a2 ? a2.pos2 = a.pos1 : null;
			}
			e.innerHTML = def.e.innerHTML;
			ret = this.expandMacro(e, def.ext);
		} else {
			ret = new HtmlElement(def.e.ownerDocument, undefined, def.name2,
					use.pos.i1, use.pos.i2, use.pos.origin);
			for (var a of def.e.attributes.values()) {
				var a2 = ret.setAttribute(a.name, a.value, a.quote,
						a.pos1?.i1, a.pos1?.i2, a.pos1?.origin);
				a2 ? a2.pos2 = a.pos1 : null;
			}
			ret.innerHTML = def.e.innerHTML;
		}
		this.populateMacro(use, ret);
		return ret;
	}

	populateMacro(src:HtmlElement, dst:HtmlElement) {
		for (var a of src.attributes.values()) {
			var a2 = dst.setAttribute(a.name, a.value, a.quote,
					a.pos1?.i1, a.pos1?.i2, a.pos1?.origin);
			a2 ? a2.pos2 = a.pos1 : null;
		}
		var slots = this.collectSlots(dst);
		for (var n of src.children.slice()) {
			var slotName = 'default', s;
			if (n.nodeType === ELEMENT_NODE
				&& ((s = (n as HtmlElement).getAttribute(SLOT_ATTR)))) {
				slotName = s;
			}
			var slot = slots.get(slotName);
			if (slot) {
				slot.parentElement?.addChild(n, slot);
			} else {
				var err = new HtmlException(
					this.parser.origins[n.pos.origin],
					'',
					n.pos.i1,
					this.sources[n.pos.origin]
				);
				throw new PreprocessorError(
					'unknown slot "$slotName"', err.fname, this.rootPath,
					err.pos, err.row, err.col
				);
			}
		}
		for (var e of slots.values()) {
			var p = e.parentElement;
			if (p) {
				e.remove();
				this.joinAdjacentTexts(p);
			}
		}
		this.expandMacros(dst);
	}

	// =========================================================================
	// util
	// =========================================================================

	lookupTags(p:HtmlElement, tags:Set<string>): Array<HtmlElement> {
		var ret = new Array<HtmlElement>();
		function f(p:HtmlElement) {
			for (var n of p.children) {
				if (n.nodeType === ELEMENT_NODE) {
					if (tags.has((n as HtmlElement).tagName)) {
						ret.push(n as HtmlElement);
					} else {
						f(n as HtmlElement);
					}
				}
			}
		}
		f(p);
		return ret;
	}

	joinAdjacentTexts(e:HtmlElement) {
		var prevTextNode:HtmlText|undefined = undefined;
		for (var n of e.children.slice()) {
			if (n.nodeType === TEXT_NODE) {
				if (prevTextNode != null) {
					prevTextNode.nodeValue += (n as HtmlText).nodeValue;
					n.remove();
				} else {
					prevTextNode = n as HtmlText;
				}
			} else {
				prevTextNode = undefined;
			}
		}
	}

}

export class PreprocessorError {
	msg: string;
	fname?: string;
	pos?: number;
	row?: number;
	col?: number;

	constructor(msg:string, fname?:string, rootPath?:string,
				pos?:number, row?:number, col?:number) {
		this.msg = msg;
		this.fname = (rootPath && fname && fname.startsWith(rootPath)
			? fname.substr(rootPath.length + (rootPath.endsWith('/') ? 0 : 1))
			: fname);
		this.pos = (pos ? pos : 0);
		this.row = row;
		this.col = col;	
	}

	toString() {
		return this.fname
			? `${this.fname}:${this.row} col ${this.col}: ${this.msg}`
			: this.msg;
	}
}

// =============================================================================
// util
// =============================================================================

export function domGetTop(doc:HtmlDocument, name:string): HtmlElement | undefined {
	var root = doc.getFirstElementChild();
	if (root) {
		for (var n of root.children) {
			if (n.nodeType === ELEMENT_NODE && (n as HtmlElement).tagName === name) {
				return n as HtmlElement;
			}
		}
	}
	return undefined;
}

function domEnsureHeadAndBody(doc:HtmlDocument) {
	var e = doc.getFirstElementChild(), body, head;
	if (!(body = domGetTop(doc, 'BODY'))) {
		body = new HtmlElement(doc, e, 'BODY', 0, 0, doc.pos.origin);
	}
	if (!(head = domGetTop(doc, 'HEAD')) == null) {
		head = new HtmlElement(doc, undefined, 'BODY', 0, 0, doc.pos.origin);
		e?.addChild(head, body);
	}
}
