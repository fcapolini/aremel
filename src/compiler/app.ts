import { PageObj, RuntimeObj, ValueObj } from "../shared/runtime";
import { HtmlDocument, HtmlElement } from "./htmldom";

export default class App {
	page: PageObj;
	root: Scope;

	constructor(doc:HtmlDocument) {
		this.page = {doc:doc, nodes:[]};
		this.root = this.load(undefined, doc.getFirstElementChild());
	}

	load(parent?:Scope, dom?:HtmlElement): Scope {
		var ret = new Scope(parent, dom);
		return ret;
	}
}

export class Scope {
	parent?: Scope;
	dom?: HtmlElement;
	children: Scope[];

	constructor(parent?:Scope, dom?:HtmlElement) {
		if ((this.parent = parent)) {
			parent.children.push(this);
		}
		this.dom = dom;
		this.children = [];
	}
}

export class Value {
	scope: Scope;
	obj: ValueObj;

	constructor(scope:Scope, v:any) {
		this.scope = scope;
		this.obj = {v:v};
	}
}

export class AppError {
}
