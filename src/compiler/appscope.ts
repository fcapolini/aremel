import { DomElement, DomNode, DomTextNode } from "../shared/dom";
import App, { JS_AKA_VAR, JS_TEXT_VALUE_PREFIX, nonValues, Prop } from "./app";
import { AppValue } from "./appvalue";
import { HtmlElement } from "./htmldom";
import Preprocessor from "./preprocessor";
import { StringBuf } from "./util";

export class AppScope {
	app: App;
	id: number;
	dom: HtmlElement;
	aka: string | undefined;
	parent: AppScope | undefined;
	children: Array<AppScope>;
	texts: Array<DomTextNode>;
	values: Map<string,AppValue>;

	constructor(app:App,
				id:number,
				dom:HtmlElement,
				props:Map<string,Prop>,
				prepro?:Preprocessor,
				parent?:AppScope) {
		this.app = app;
		this.id = id;
		this.dom = dom;
		this.aka = props.get(JS_AKA_VAR)?.val;
		if ((this.parent = parent)) {
			parent.children.push(this);
		}
		this.children = [];
		this.texts = [];
		this.values = new Map();
		for (var key of props.keys()) {
			if (!nonValues.has(key)) {
				var prop = props.get(key) as Prop;
				var spos = (prepro && prop.pos
					? prepro.getSourcePos(prop.pos)
					: undefined);
				var value = new AppValue(this, key, prop.val, spos);
				this.values.set(key, value);
			}
		}
	}

	compile(prepro?:Preprocessor) {
		// add text values
		for (var t of this.texts) {
			// @ts-ignore
			var spos = prepro && t.pos ? prepro.getSourcePos(t.pos) : undefined;
			var key = JS_TEXT_VALUE_PREFIX + this._getTextPath(t);
			var value = new AppValue(this, key, t.nodeValue, spos);
			this.values.set(key, value);
		}
		// compile values
		this.values.forEach((value, key) => {
			value.compile();
		});
		// compile children
		this.children.forEach((child) => {
			child.compile();
		});
	}

	output(sb:StringBuf): StringBuf {

		// enter scope
		if (this.parent) {
			sb.add(`__f = function(__outer,__outer_get_data,__outer_data,__add,`
				+ `__link,__ev,__domGetter,__self) {\n`);
			sb.add(`var __this, __scope_${this.id};\n`);
			sb.add(`__this = __scope_${this.id} = {__outer:__outer,`
				+ `__dom:__domGetter(${this.id}),__self:__self};\n`);
			sb.add(`__scope_${this.parent.id}.__scope_${this.id} = __this;\n`);
		} else {
			sb.add(`function(__rt) {\n`
				+ `var __f, __get_data = null, data = null;\n`
				+ `var __add = __rt.add;\n`
				+ `function __nn(v) {return v != null ? v : "";}\n`
				+ `function __link(l) {__rt.links.push(l);}\n`
				+ `function __ev(h) {__rt.evhandlers.push(h);}\n`
				+ `function __domGetter(id) {return __rt.page.nodes[id];}\n`);
			sb.add(`var __this, __scope_${this.id};\n`);
			sb.add(`__this = __scope_${this.id} = `
				+ `{__dom:__domGetter(${this.id}),`
				+ `__win:__rt.page.window,`
				+ `__doc:__rt.page.doc};\n`);
		}

		// values
		var keys = new Array();
		this.values.forEach((v, k) => keys.push(k));
		keys = keys.sort((a, b) => (a > b ? 1 : (a < b ? -1 : 0)));
		keys.forEach((k) => this.values.get(k)?.output(sb));

		this.children.forEach(child => {
			child.output(sb);
			sb.add('\n');
			if (child.aka) {
				sb.add(`__this.${child.aka} = `);
			}
			sb.add(`__f(__this,__get_data,data,__add,__link,__ev,__domGetter,__f);\n`);
		});

		// exit scope
		sb.add(`return __this;\n}`);

		return sb;
	}

	_getTextPath(n:DomNode): string {
		var ret = [], p;
		while (n != this.dom && (p = n.parentElement)) {
			var i = this._domChildIndex(p, n);
			ret.unshift(i);
			n = p;
		}
		return ret.join('_');
	}

	_domChildIndex(parent:DomElement, child:DomNode): number {
		var ret = -1;
		parent.childNodes.forEach((n, i) => {
			if (n === child) {
				ret = i;
			}
		});
		return ret;
	}

}
