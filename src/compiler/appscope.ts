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

	output(cb:StringBuf) {
		//TODO
	}

}
