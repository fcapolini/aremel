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

const MAX_RECURSIONS = 100;

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

export interface VirtualFile {
	fname: string,
	content: string,
}

export default class Preprocessor {
	rootPath: string;
	parser: HtmlParser;
	sources: Array<string>;
	macros: Map<string, Definition>;
	virtualFiles: Map<string, string>|undefined;

	constructor(rootPath:string, virtualFiles?:Array<VirtualFile>) {
		this.rootPath = rootPath;
		this.parser = new HtmlParser();
		this.sources = [];
		this.macros = new Map();
		if (virtualFiles) {
			this.virtualFiles = new Map();
			for (var v of virtualFiles) {
				var filePath = path.normalize(path.join(rootPath, v.fname));;
				this.virtualFiles.set(filePath, v.content);
			}
		}
	}

	read(fname:string, embeddedInclude?:string): HtmlDocument | undefined {
		if (this.sources.length > 0
				|| this.macros.size > 0
				|| this.parser.origins.length > 0) {
			this.sources = [];
			this.macros = new Map();
			this.parser.origins = [];
		}
		var ret = this._readFile(fname, 0);
		if (ret) {
			if (embeddedInclude != null) {
				domEnsureHeadAndBody(ret);
				var head = domGetTop(ret, 'HEAD');
				if (head) {
					var inc = this.parser.parseDoc(embeddedInclude, 'embedded');
					this._include(inc.firstElementChild, head as HtmlElement, undefined);
					this._joinAdjacentTexts(head);
				}
			}
			this._processMacros(ret);
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

	_readFile(fname:string,
			nesting:number,
			currPath?:string,
			once=false,
			includedBy?:HtmlElement): HtmlDocument | undefined {
		if (nesting >= MAX_RECURSIONS) {
			throw new PreprocessorError(`Too many nested includes/imports "${fname}"`);
		}
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
			if (this.virtualFiles?.has(filePath)) {
				text = this.virtualFiles.get(filePath) as string;
			} else {
				text = fs.readFileSync(filePath, {encoding: 'utf8'});
			}
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
				this._processIncludes(ret, currPath, nesting);
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

	_processIncludes(doc:HtmlDocument, currPath:string, nesting:number) {
		var tags = new Set([INCLUDE_TAG, IMPORT_TAG]);
		// tags.add(INCLUDE_TAG);
		// tags.add(IMPORT_TAG);
		var includes = lookupTags(doc, tags);
		for (var e of includes) {
			var src = e.getAttribute(INCLUDE_ARG);
			if (src && (src = src.trim()).length > 0) {
				this._processInclude(e, src, e.tagName === IMPORT_TAG, currPath, nesting);
			} else {
				throw new HtmlException(
					'Missing "src" attribute', this.parser.origins[e.pos.origin],
					e.pos.i1, this.sources[e.pos.origin]
				);
			}
		}
	}

	_processInclude(e:HtmlElement, src:string, once:boolean, currPath:string, nesting:number) {
		var parent = e.parentElement;
		var before = undefined;
		if (parent) {
			var i = parent.children.indexOf(e) + 1;
			before = (i < parent.children.length ? parent.children[i] : undefined);
			e.remove();
			var doc = this._readFile(src, nesting + 1, currPath, once, e);
			if (doc != null) {
				var root = doc.getFirstElementChild();
				if (root) {
					this._include(root, parent, before);
				}
			}
			this._joinAdjacentTexts(parent);
		}
	}

	_include(root:HtmlElement, parent:HtmlElement, before?:HtmlNode) {
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

	_processMacros(doc:HtmlDocument) {
		this._collectMacros(doc, 0);
		this._expandMacros(doc, 0);
	}

	// -------------------------------------------------------------------------
	// collect
	// -------------------------------------------------------------------------

	_collectMacros(p:HtmlElement, nesting:number) {
		var tags = new Set<string>();
		tags.add(DEFINE_TAG);
		var macros = lookupTags(p, tags);
		for (var e of macros) {
			this._collectMacro(e, nesting);
		}
	}

	_collectMacro(e:HtmlElement, nesting:number) {
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
			this._joinAdjacentTexts(parent);
		}
		e.setAttribute(DEFINE_ARG, undefined);
		this._expandMacros(e, nesting);
		this.macros.set(names[0], {
			name1: names[0],
			name2: names[1],
			e: e,
			ext: this.macros.get(names[1])
		});
	}

	_collectSlots(p:HtmlElement) {
		var ret = new Map<string, HtmlElement>();
		var tags = new Set<string>();
		tags.add(SLOT_TAG);
		var slots = lookupTags(p, tags);
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

	_expandMacros(p:HtmlElement, nesting:number) {
		var that = this;
		function f(p:HtmlElement) {
			var ret = false;
			for (var n of p.children.slice()) {
				if (n.nodeType === ELEMENT_NODE) {
					var name = (n as HtmlElement).tagName;
					var def = that.macros.get(name);
					if (def != null) {
						var e = that._expandMacro(n as HtmlElement, def, nesting);
						p.addChild(e, n);
						n.remove();
						ret = true;
					} else {
						that._expandMacros(n as HtmlElement, nesting);
					}
				}
			}
			return ret;
		}
		if (f(p)) {
			this._joinAdjacentTexts(p);
		}
	}

	_expandMacro(use:HtmlElement, def:Definition, nesting:number): HtmlElement {
		if (nesting >= MAX_RECURSIONS) {
			var err = new HtmlException(
				this.parser.origins[use.pos.origin],
				'',
				use.pos.i1,
				this.sources[use.pos.origin]
			);
			throw new PreprocessorError(
				`Too many nested macros "${use.tagName}"`, err.fname, this.rootPath,
				err.pos, err.row, err.col
			);
		}
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
			ret = this._expandMacro(e, def.ext, nesting + 1);
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
		this._populateMacro(use, ret, nesting);
		return ret;
	}

	_populateMacro(src:HtmlElement, dst:HtmlElement, nesting:number) {
		for (var a of src.attributes.values()) {
			var a2 = dst.setAttribute(a.name, a.value, a.quote,
					a.pos1?.i1, a.pos1?.i2, a.pos1?.origin);
			a2 ? a2.pos2 = a.pos1 : null;
		}
		var slots = this._collectSlots(dst);
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
					`unknown slot "${slotName}"`, err.fname, this.rootPath,
					err.pos, err.row, err.col
				);
			}
		}
		for (var e of slots.values()) {
			var p = e.parentElement;
			if (p) {
				e.remove();
				this._joinAdjacentTexts(p);
			}
		}
		this._expandMacros(dst, nesting + 1);
	}

	// =========================================================================
	// util
	// =========================================================================

	_joinAdjacentTexts(e:HtmlElement) {
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

export function lookupTags(p:HtmlElement, tags:Set<string>): Array<HtmlElement> {
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

function domEnsureHeadAndBody(doc:HtmlDocument) {
	var e = doc.getFirstElementChild(), body, head;
	if (!(body = domGetTop(doc, 'BODY'))) {
		body = new HtmlElement(doc, e, 'BODY', 0, 0, doc.pos.origin);
	}
	if (!(head = domGetTop(doc, 'HEAD'))) {
		head = new HtmlElement(doc, undefined, 'HEAD', 0, 0, doc.pos.origin);
		e?.addChild(head, body);
	}
}
