import App, { JS_AKA_VAR, JS_AUTOHIDE_CLASS } from "../../src/compiler/app";
import HtmlParser from "../../src/compiler/htmlparser";
import { normalizeText } from "../../src/compiler/util";

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
		expect(app.root.props.size).toBe(1);
		expect(app.root.props.get(JS_AKA_VAR)?.val).toBe('page');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :v1="a"></html>', () => {
		var doc = HtmlParser.parse('<html :v1="a"></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.props.size).toBe(2);
		expect(app.root.props.get('v1')?.val).toBe('a');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :class-my-page=[[true]]></html>', () => {
		var doc = HtmlParser.parse('<html :class-my-page=[[true]]></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.props.size).toBe(2);
		expect(app.root.props.get('class_myPage')?.val).toBe('[[true]]');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :style-font-size="1rm"></html>', () => {
		var doc = HtmlParser.parse('<html :style-font-size="1rm"></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.props.size).toBe(2);
		expect(app.root.props.get('style_fontSize')?.val).toBe('1rm');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :attr-data-name="jolly"></html>', () => {
		var doc = HtmlParser.parse('<html :attr-data-name="jolly"></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.props.size).toBe(2);
		expect(app.root.props.get('attr_dataName')?.val).toBe('jolly');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :on-v1=[[console.log(v1)]]></html>', () => {
		var doc = HtmlParser.parse('<html :on-v1=[[console.log(v1)]]></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.props.size).toBe(2);
		expect(app.root.props.get('on_v1')?.val).toBe('[[console.log(v1)]]');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :event-click=[[(ev) => console.log(ev)]]></html>', () => {
		var doc = HtmlParser.parse('<html :event-click=[[(ev) => console.log(ev)]]></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.props.size).toBe(2);
		expect(app.root.props.get('event_click')?.val).toBe('[[(ev) => console.log(ev)]]');
		expect(app.root.children.length).toBe(0);
	});
	
	it('should load <html :hidden=[[true]]></html>', () => {
		var doc = HtmlParser.parse('<html :hidden=[[true]]></html>');
		var app = new App(doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.props.size).toBe(2);
		expect(app.root.props.get(JS_AUTOHIDE_CLASS)?.val).toBe('[[true]]');
		expect(app.root.children.length).toBe(0);
	});
	
	it('should compile <html></html>', () => {
		var doc = HtmlParser.parse('<html></html>');
		var app = new App(doc);
		var js = app.compile();
		expect(js).toBe(normalizeText(`function(__rt) {
			function __nn(v) {return v != null ? v : \"\"}
			function __add(v) {__rt.values.push(v); return v;}
			function __link(l) {__rt.links.push(l);}
			function __ev(h) {__rt.evhandlers.push(h);}
			function __domGetter(id) {return __rt.page.nodes[id];}
			var __f, __get_data = null, data = null;
			var __this = {};
			var __dom = __this.__dom = __rt.page.nodes[0];
			var __doc = __this.__doc = __dom.ownerDocument;
			var __aka = __this.__aka = \"page\";
			var __id = __this.__id = 0;
			return __this;
		}`));
	});

	it('should compile <html :v1="1"></html>', () => {
		var doc = HtmlParser.parse('<html :v1="1"></html>');
		var app = new App(doc);
		var js = app.compile();
		expect(js).toBe(normalizeText(`function(__rt) {
			function __nn(v) {return v != null ? v : \"\"}
			function __add(v) {__rt.values.push(v); return v;}
			function __link(l) {__rt.links.push(l);}
			function __ev(h) {__rt.evhandlers.push(h);}
			function __domGetter(id) {return __rt.page.nodes[id];}
			var __f, __get_data = null, data = null;
			var __this = {};
			var __dom = __this.__dom = __rt.page.nodes[0];
			var __doc = __this.__doc = __dom.ownerDocument;
			var __aka = __this.__aka = \"page\";
			var __id = __this.__id = 0;\n` +
			//
			// start of v1 code
			//
			// 1) declaration
			`var v1,__get_v1,__set_v1;\n` +
			// 2) initialization
			`v1 = __this.v1 = __add({v:"1"});\n` +
			// 3) closure accessors
			`__get_v1 = function() {return __rt.get(v1)}
			__set_v1 = function(v) {return __rt.set(v1, v)}\n` +
			// 4) object accessors
			`Object.defineProperty(__this, "v1", {get:__get_v1, set:__set_v1});
			Object.defineProperty(__this, "__value_v1", {get:function() {return v1}});\n` +
			//
			// end of v1 code
			//
			`return __this;
		}`));
	});

	it('should compile <html><head></head><body></body></html>', () => {
		var doc = HtmlParser.parse('<html><head></head><body></body></html>');
		var app = new App(doc);
		expect(app.root.children.length).toBe(2);
		expect(app.root.aka).toBe('page');
		expect(app.root.children[0].aka).toBe('head');
		expect(app.root.children[1].aka).toBe('body');
		var js = app.compile();
		expect(js).toBe(normalizeText(`function(__rt) {
			function __nn(v) {return v != null ? v : ""}
			function __add(v) {__rt.values.push(v); return v;}
			function __link(l) {__rt.links.push(l);}
			function __ev(h) {__rt.evhandlers.push(h);}
			function __domGetter(id) {return __rt.page.nodes[id];}
			var __f, __get_data = null, data = null;
			var __this = {};
			var __dom = __this.__dom = __rt.page.nodes[0];
			var __doc = __this.__doc = __dom.ownerDocument;
			var __aka = __this.__aka = \"page\";
			var __id = __this.__id = 0;
			var head,__get_head,body,__get_body;
			__get_head = function() {return head};
			__get_body = function() {return body};
			__f = function(__outer,__outer_get_data,__outer_data,__add,__link,__ev,__domGetter,__self) {
				var __dom = __domGetter(1);
				var __this = {__outer:__outer,__dom:__dom,__self:__self};
				var __aka = __this.__aka = "head";
				var __id = __this.__id = 1;
				return __this;
			}
			head = __this.head = __f(__this,__get_data,data,__add,__link,__ev,__domGetter,__f);
			__f = function(__outer,__outer_get_data,__outer_data,__add,__link,__ev,__domGetter,__self) {
				var __dom = __domGetter(2);
				var __this = {__outer:__outer,__dom:__dom,__self:__self};
				var __aka = __this.__aka = "body";
				var __id = __this.__id = 2;
				return __this;
			}
			body = __this.body = __f(__this,__get_data,data,__add,__link,__ev,__domGetter,__f);
			return __this;
		}`));
	});

});
