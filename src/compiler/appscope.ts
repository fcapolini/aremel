import { JS_AKA_VAR, nonValues, Prop } from "./app";
import { AppValue } from "./appvalue";
import { HtmlElement, HtmlText } from "./htmldom";
import Preprocessor from "./preprocessor";
import { StringBuf } from "./util";

export class AppScope {
	id: number;
	dom: HtmlElement;
	aka: String | undefined;
	parent: AppScope | undefined;
	children: Array<AppScope>;
	texts: Array<HtmlText>;
	values: Map<string,AppValue>;

	constructor(id:number,
				dom:HtmlElement,
				props:Map<string,Prop>,
				prepro?:Preprocessor,
				parent?:AppScope) {
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

	compile() {
		this.values.forEach((value, key) => {
			value.compile();
		});
		this.children.forEach((child) => {
			child.compile();
		});
	}

	output(sb:StringBuf): StringBuf {

		// enter scope
		if (this.parent) {
			sb.add(`__f = function(__outer,__outer_get_data,__outer_data,__add,`
				+ `__link,__ev,__domGetter,__self) {\n`);
			sb.add(`var __this = __scope_${this.id} = {__outer:__outer,`
				+ `__dom:__rt.page.nodes[${this.id}],__self:__self};\n`);
		} else {
			sb.add(`function(__rt) {\n`
				+ `var __f;\n`
				+ `function __nn(v) {return v != null ? v : "";}\n`
				+ `function __add(v) {__rt.values.push(v); return v;}\n`
				+ `function __link(l) {__rt.links.push(l);}\n`
				+ `function __ev(h) {__rt.evhandlers.push(h);}\n`);
			sb.add(`var __this = __scope_${this.id} = `
				+ `{__dom:__rt.page.nodes[${this.id}],`
				+ `__doc:__dom.ownerDocument};\n`);
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

}
