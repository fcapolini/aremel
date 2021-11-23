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
	
	it('should generate <html></html>', () => {
		var doc = HtmlParser.parse('<html></html>');
		var app = new App(doc);
		var js = app.toString();
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

});
