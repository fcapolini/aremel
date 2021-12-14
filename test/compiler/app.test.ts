import App from "../../src/compiler/app";
import { AppValue } from "../../src/compiler/appvalue";
import HtmlParser from "../../src/compiler/htmlparser";
import { JS_AUTOHIDE_CLASS } from "../../src/shared/runtime";
import { normalizeText, StringBuf } from "../../src/shared/util";

let rootPath:string;

describe("test server app", () => {

	beforeAll(() => {
		rootPath = process.cwd() + '/test/compiler/app';
	});

	it('should load <html></html>', () => {
		var doc = HtmlParser.parse('<html></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(0);
		expect(app.root.aka).toBe('page');
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :v1="a"></html>', () => {
		var doc = HtmlParser.parse('<html :v1="a"></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('v1')?.val).toBe('a');
		expect(app.root.values.get('v1')?.expr?.fndecl).toBeFalsy();
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :class-my-page=[[true]]></html>', () => {
		var doc = HtmlParser.parse('<html :class-my-page=[[true]]></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('class_myPage')?.expr?.src).toBe('true');
		expect(app.root.values.get('class_myPage')?.expr?.fndecl).toBeFalsy();
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :style-font-size="1rm"></html>', () => {
		var doc = HtmlParser.parse('<html :style-font-size="1rm"></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('style_fontSize')?.val).toBe('1rm');
		expect(app.root.values.get('style_fontSize')?.expr?.fndecl).toBeFalsy();
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :attr-data-name="jolly"></html>', () => {
		var doc = HtmlParser.parse('<html :attr-data-name="jolly"></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('attr_dataName')?.val).toBe('jolly');
		expect(app.root.values.get('attr_dataName')?.expr?.fndecl).toBeFalsy();
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :on-v1=[[console.log(v1)]]></html>', () => {
		var doc = HtmlParser.parse('<html :on-v1=[[console.log(v1)]]></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get('on_v1')?.expr?.src).toBe('console.log(v1)');
		expect(app.root.values.get('on_v1')?.expr?.fndecl).toBeFalsy();
		expect(app.root.children.length).toBe(0);
	});

	it('should load <html :event-click=[[(ev) => console.log(ev)]]></html>', () => {
		var doc = HtmlParser.parse('<html :event-click=[[(ev) => console.log(ev)]]></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.children.length).toBe(0);
		expect(app.root.values.size).toBe(1);
		var value = app.root.values.get('event_click');
		expect(value).toBeDefined();
		expect(value?.expr?.src).toBe('(ev) => console.log(ev)');
		expect(value?.expr?.code).toBe('(ev) => console.log(ev);');
		expect(value?.expr?.fndecl).toBeTruthy();
	});
	
	it('should load <html :event-click=[[function(ev) {console.log(ev)}]]></html>', () => {
		var doc = HtmlParser.parse('<html :event-click=[[function(ev) {console.log(ev)}]]></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.children.length).toBe(0);
		expect(app.root.values.size).toBe(1);
		var value = app.root.values.get('event_click');
		expect(value).toBeDefined();
		expect(value?.expr?.src).toBe('(function(ev) {console.log(ev)})');
		expect(value?.expr?.code).toBe('(function (ev) {console.log(ev);});');
		expect(value?.expr?.fndecl).toBeTruthy();
		expect(doc.toString()).toBe(`<html data-aremel="0"></html>`);
		expect(app.output().script).toBe(normalizeText(`function(__rt) {
			var __f, __data = null;
			var __add = __rt.add;
			function __nn(v) {return v != null ? v : \"\";}
			function __link(l) {__rt.links.push(l);}
			function __ev(h) {__rt.evhandlers.push(h);}
			function __domGetter(id) {return __rt.page.nodes[id];}
			var __this, __scope_0;
			__this = __scope_0 = {__dom:__domGetter(0),__win:__rt.page.window,__doc:__rt.page.doc};
			var __id = __this.__id = 0;
			var __dom = __this.__dom;
			__ev({e:__this.__dom,t:"click",h:(function (ev) {console.log(ev);})});
			return __this;
		}`));
	});
	
	it(`should make function values independent of values they reference`, () => {
		var doc = HtmlParser.parse('<html :v1=[[1]] :event-click=[[function(ev) {console.log(v1)}]]></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.children.length).toBe(0);
		expect(app.root.values.size).toBe(2);
		var value = app.root.values.get('event_click');
		expect(value).toBeDefined();
		expect(value?.expr?.src).toBe('(function(ev) {console.log(v1)})');
		expect(value?.expr?.code).toBe('(function (ev) {console.log(__scope_0.v1);});');
		expect(value?.expr?.fndecl).toBeTruthy();
		expect(value?.refs.size).toBe(0);
	});

	it('should load <html :hidden=[[true]]></html>', () => {
		var doc = HtmlParser.parse('<html :hidden=[[true]]></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(1);
		expect(app.root.values.get(JS_AUTOHIDE_CLASS)?.expr?.src).toBe('true');
		expect(app.root.values.get(JS_AUTOHIDE_CLASS)?.expr?.fndecl).toBeFalsy();
		expect(app.root.children.length).toBe(0);
	});
	
	it('should load <html><body :v1="a"/></html>', () => {
		var doc = HtmlParser.parse('<html><body :v1="a"/></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect(app.root).toBeDefined();
		expect(app.root.dom).toBe(doc.getFirstElementChild());
		expect(app.root.values.size).toBe(0);
		expect(app.root.children.length).toBe(1);
		var body = app.root.children[0];
		expect(body.aka).toBe('body');
		expect(body.values.get('v1')?.val).toBe('a');
		expect(body.values.get('v1')?.expr?.fndecl).toBeFalsy();
	});

	it('should load <html><body :v1="a" :v2=[[v1 + "!"]]/></html>', () => {
		var doc = HtmlParser.parse('<html><body :v1="a" :v2=[[v1 + "!"]]/></html>');
		var app = new App(new URL('http://localhost/'), doc);
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
		expect(v1code).toBe('var v1 = __this.v1 = __add(__this,"v1",{v:"a"});\n');

		var v2 = body.values.get('v2') as AppValue;
		var v2code = v2.output(new StringBuf(), false).toString();
		expect(v2code).toBe('var v2 = __this.v2 = __add(__this,"v2",{fn:function() {return __scope_1.v1 + "!";}});\n');

		expect (app.output().script).toBe(normalizeText(
		`function(__rt) {
			var __f, __data = null;
			var __add = __rt.add;
			function __nn(v) {return v != null ? v : "";}
			function __link(l) {__rt.links.push(l);}
			function __ev(h) {__rt.evhandlers.push(h);}
			function __domGetter(id) {return __rt.page.nodes[id];}
			var __this, __scope_0;
			__this = __scope_0 = {__dom:__domGetter(0),__win:__rt.page.window,__doc:__rt.page.doc};
			var __id = __this.__id = 0;
			var __dom = __this.__dom;
			__f = function(__outer,__data,__add,__link,__ev,__domGetter,__self) {
				var __this, __scope_1;
				__this = __scope_1 = {__outer:__outer,__dom:__domGetter(1),__self:__self};
				__scope_0.__scope_1 = __this;
				var __id = __this.__id = 1;
				var __dom = __this.__dom;
				var v1 = __this.v1 = __add(__this,"v1",{v:"a"});
				Object.defineProperty(__this,"v1",{get:function() {return __rt.get(v1)}, set:function(__v_) {return __rt.set(v1, __v_)}});
				Object.defineProperty(__this,"__value_v1",{get:function() {return v1}});
				var v2 = __this.v2 = __add(__this,"v2",{fn:function() {return __scope_1.v1 + "!";}});
				Object.defineProperty(__this,"v2",{get:function() {return __rt.get(v2)}, set:function(__v_) {return __rt.set(v2, __v_)}});
				Object.defineProperty(__this,"__value_v2",{get:function() {return v2}});
				__link({"o":__this.__value_v2, "v":function() {return __scope_0.__scope_1.__value_v1;}});
				return __this;
			}
			__this.body = __f(__this,null,__add,__link,__ev,__domGetter,__f);
			return __this;
		}`));
	});

	it('should load <html :v1=[[1]]><body :v2=[[v1 * 2]]/></html>', () => {
		var doc = HtmlParser.parse('<html :v1=[[1]]><body :v2=[[v1 * 2]]/></html>');
		var app = new App(new URL('http://localhost/'), doc);
		expect (app.output().script).toBe(normalizeText(
		`function(__rt) {
			var __f, __data = null;
			var __add = __rt.add;
			function __nn(v) {return v != null ? v : "";}
			function __link(l) {__rt.links.push(l);}
			function __ev(h) {__rt.evhandlers.push(h);}
			function __domGetter(id) {return __rt.page.nodes[id];}
			var __this, __scope_0;
			__this = __scope_0 = {__dom:__domGetter(0),__win:__rt.page.window,__doc:__rt.page.doc};
			var __id = __this.__id = 0;
			var __dom = __this.__dom;
			var v1 = __this.v1 = __add(__this,"v1",{fn:function() {return 1;}});
			Object.defineProperty(__this,"v1",{get:function() {return __rt.get(v1)}, set:function(__v_) {return __rt.set(v1, __v_)}});
			Object.defineProperty(__this,"__value_v1",{get:function() {return v1}});
			__f = function(__outer,__data,__add,__link,__ev,__domGetter,__self) {
				var __this, __scope_1;
				__this = __scope_1 = {__outer:__outer,__dom:__domGetter(1),__self:__self};
				__scope_0.__scope_1 = __this;
				var __id = __this.__id = 1;
				var __dom = __this.__dom;
				var v2 = __this.v2 = __add(__this,"v2",{fn:function() {return __scope_0.v1 * 2;}});
				Object.defineProperty(__this,"v2",{get:function() {return __rt.get(v2)}, set:function(__v_) {return __rt.set(v2, __v_)}});
				Object.defineProperty(__this,"__value_v2",{get:function() {return v2}});
				__link({"o":__this.__value_v2, "v":function() {return __scope_0.__value_v1;}});
				return __this;
			}
			__this.body = __f(__this,null,__add,__link,__ev,__domGetter,__f);
			return __this;
		}`));
	});

	it("should execute complex class expression", () => {
		var doc = HtmlParser.parse(`<html
			:type="primary"
			:size=""
			:outline=[[false]]
			:nowrap=[[true]]
			class="btn btn-[[outline ? 'outline-' : '']][[type]][[nowrap ? ' text-nowrap' : '']][[size ? ' btn-'+size : '']]"
		></html>`);
		var app = new App(new URL('http://localhost/'), doc);
		var page = app.output();
		// console.log(page.script);
		expect (page.script).toBe(normalizeText(
		`function(__rt) {
			var __f, __data = null;
			var __add = __rt.add;
			function __nn(v) {return v != null ? v : "";}
			function __link(l) {__rt.links.push(l);}
			function __ev(h) {__rt.evhandlers.push(h);}
			function __domGetter(id) {return __rt.page.nodes[id];}
			var __this, __scope_0;
			__this = __scope_0 = {__dom:__domGetter(0),__win:__rt.page.window,__doc:__rt.page.doc};
			var __id = __this.__id = 0;
			var __dom = __this.__dom;
			var attr_class = __this.attr_class = __add(__this,"attr_class",{fn:function() {return 'btn btn-' + __nn(__scope_0.outline ? 'outline-' : '') + __nn(__scope_0.type) + __nn(__scope_0.nowrap ? ' text-nowrap' : '') + __nn(__scope_0.size ? ' btn-' + __scope_0.size : '');}});
			Object.defineProperty(__this,"attr_class",{get:function() {return __rt.get(attr_class)}, set:function(__v_) {return __rt.set(attr_class, __v_)}});
			Object.defineProperty(__this,"__value_attr_class",{get:function() {return attr_class}});
			__link({"o":__this.__value_attr_class, "v":function() {return __scope_0.__value_outline;}});
			__link({"o":__this.__value_attr_class, "v":function() {return __scope_0.__value_type;}});
			__link({"o":__this.__value_attr_class, "v":function() {return __scope_0.__value_nowrap;}});
			__link({"o":__this.__value_attr_class, "v":function() {return __scope_0.__value_size;}});
			var nowrap = __this.nowrap = __add(__this,"nowrap",{fn:function() {return true;}});
			Object.defineProperty(__this,"nowrap",{get:function() {return __rt.get(nowrap)}, set:function(__v_) {return __rt.set(nowrap, __v_)}});
			Object.defineProperty(__this,"__value_nowrap",{get:function() {return nowrap}});
			var outline = __this.outline = __add(__this,"outline",{fn:function() {return false;}});
			Object.defineProperty(__this,"outline",{get:function() {return __rt.get(outline)}, set:function(__v_) {return __rt.set(outline, __v_)}});
			Object.defineProperty(__this,"__value_outline",{get:function() {return outline}});
			var size = __this.size = __add(__this,"size",{v:""});
			Object.defineProperty(__this,"size",{get:function() {return __rt.get(size)}, set:function(__v_) {return __rt.set(size, __v_)}});
			Object.defineProperty(__this,"__value_size",{get:function() {return size}});
			var type = __this.type = __add(__this,"type",{v:"primary"});
			Object.defineProperty(__this,"type",{get:function() {return __rt.get(type)}, set:function(__v_) {return __rt.set(type, __v_)}});
			Object.defineProperty(__this,"__value_type",{get:function() {return type}});
			return __this;
		}`));
	});

});
