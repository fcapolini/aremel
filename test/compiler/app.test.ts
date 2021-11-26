import App, { JS_AKA_VAR, JS_AUTOHIDE_CLASS } from "../../src/compiler/app";
import { AppValue } from "../../src/compiler/appvalue";
import HtmlParser from "../../src/compiler/htmlparser";
import { normalizeText, StringBuf } from "../../src/compiler/util";

let rootPath:string;

describe("test server app", () => {

	beforeAll(() => {
		rootPath = process.cwd() + '/test/compiler/app';
	});

	it('should load <html></html>', () => {
		var doc = HtmlParser.parse('<html></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(0);
		expect(app.root.aka).toBe('page');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :v1="a"></html>', () => {
		var doc = HtmlParser.parse('<html :v1="a"></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('v1')?.val).toBe('a');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :class-my-page=[[true]]></html>', () => {
		var doc = HtmlParser.parse('<html :class-my-page=[[true]]></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('class_myPage')?.expr?.src).toBe('true');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :style-font-size="1rm"></html>', () => {
		var doc = HtmlParser.parse('<html :style-font-size="1rm"></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('style_fontSize')?.val).toBe('1rm');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :attr-data-name="jolly"></html>', () => {
		var doc = HtmlParser.parse('<html :attr-data-name="jolly"></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('attr_dataName')?.val).toBe('jolly');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :on-v1=[[console.log(v1)]]></html>', () => {
		var doc = HtmlParser.parse('<html :on-v1=[[console.log(v1)]]></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('on_v1')?.expr?.src).toBe('console.log(v1)');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :event-click=[[(ev) => console.log(ev)]]></html>', () => {
		var doc = HtmlParser.parse('<html :event-click=[[(ev) => console.log(ev)]]></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('event_click')?.expr?.src).toBe('(ev) => console.log(ev)');
		expect(app.root.children.length).toBe(0);
	});
	
	it('should load <html :hidden=[[true]]></html>', () => {
		var doc = HtmlParser.parse('<html :hidden=[[true]]></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get(JS_AUTOHIDE_CLASS)?.expr?.src).toBe('true');
		expect(app.root.children.length).toBe(0);
	});
	
	it('should load <html><body :v1="a"/></html>', () => {
		var doc = HtmlParser.parse('<html><body :v1="a"/></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(0);
		expect(app.root.children.length).toBe(1);
		var body = app.root.children[0];
		expect(body.aka).toBe('body');
		expect(body.values.get('v1')?.val).toBe('a');
	});

	it('should load <html><body :v1="a" :v2=[[v1 + "!"]]/></html>', () => {
		var doc = HtmlParser.parse('<html><body :v1="a" :v2=[[v1 + "!"]]/></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(0);
		expect(app.root.children.length).toBe(1);

		var body = app.root.children[0];
		expect(body.aka).toBe('body');
		expect(body.values.get('v1')?.val).toBe('a');
		expect(body.values.get('v2')?.expr?.src).toBe('v1 + "!"');
		expect(body.values.get('v2')?.refs.size).toBe(1);
		expect(body.values.get('v2')?.refs.has('1.v1')).toBeTruthy();

		var v1 = body.values.get('v1') as AppValue;
		var v1code = v1.output(new StringBuf(), false).toString();
		expect(v1code).toBe('__this.v1 = __add({v:"a"});\n');

		var v2 = body.values.get('v2') as AppValue;
		var v2code = v2.output(new StringBuf(), false).toString();
		expect(v2code).toBe('__this.v2 = __add({fn:function() {__scope_1.v1 + "!";}});\n');

		expect (app.root.output(new StringBuf()).toString()).toBe(normalizeText(
		`function(__rt) {
			var __f;
			function __nn(v) {return v != null ? v : "";}
			function __add(v) {__rt.values.push(v); return v;}
			function __link(l) {__rt.links.push(l);}
			function __ev(h) {__rt.evhandlers.push(h);}
			var __this = __scope_0 = {__dom:__rt.page.nodes[0],__doc:__dom.ownerDocument};
			__f = function(__outer,__outer_get_data,__outer_data,__add,__link,__ev,__domGetter,__self) {
				var __this = __scope_1 = {__outer:__outer,__dom:__rt.page.nodes[1],__self:__self};
				__this.v1 = __add({v:"a"});
				Object.defineProperty(__this,"v1",{get:function() {return __rt.get(v1)}, set:function(v) {return __rt.set(v1, v)}});
				Object.defineProperty(__this,"__value_v1",{get:function() {return v1}});
				__this.v2 = __add({fn:function() {__scope_1.v1 + "!";}});
				Object.defineProperty(__this,"v2",{get:function() {return __rt.get(v2)}, set:function(v) {return __rt.set(v2, v)}});
				Object.defineProperty(__this,"__value_v2",{get:function() {return v2}});
				__link({"o":__this.__value_v2, "v":function() {return __scope_1.__value_v1;}});
				return __this;
			}
			__this.body = __f(__this,__get_data,data,__add,__link,__ev,__domGetter,__f);
			return __this;
		}`));
	});

});
