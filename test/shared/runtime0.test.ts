import App from "../../src/compiler/app";
import { HtmlDocument } from "../../src/compiler/htmldom";
import HtmlParser from "../../src/compiler/htmlparser";
import { make, RuntimeObj } from "../../src/shared/runtime";

/*
	original tests from previous version "cerere"
*/
describe("test runtime", () => {

	// =========================================================================
	// expressions
	// =========================================================================

	it("testLiteralValue", () => {
		var doc = HtmlParser.parse(`<html :title="Foo" lang="en">
		</html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html lang="en">
		</html>`);
		expect(root.title).toBe('Foo');
	});

	it("testSimpleExpressionValue", () => {
		var doc = HtmlParser.parse(`<html :title=[["Foo"]] lang="en">
		</html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html lang="en">
		</html>`);
		expect(root.title).toBe('Foo');
	});

	it("testComplexExpressionValue", () => {
		var doc = HtmlParser.parse(`<html :title=[[
			var i = 1;
			"Foo"
		]] lang="en">
		</html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html lang="en">
		</html>`);
		expect(root.title).toBe('Foo');
	});

	// =========================================================================
	// dependencies
	// =========================================================================

	it("testDependentValue1", () => {
		var doc = HtmlParser.parse(`<html :name="John" :title="Hello [[name]]!">
		</html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html>
		</html>`);
		expect(root.title).toBe('Hello John!');
		root.name = "Jane";
		expect(root.title).toBe('Hello Jane!');
		root.name = "Bob";
		expect(root.title).toBe('Hello Bob!');
		root.name = null;
		expect(root.title).toBe('Hello !');
	});

	it("testDotDependency1", () => {
		var doc = HtmlParser.parse(`<html>
			<head :color="red">
			</head>
			<body :class-red=[[head.color == "red"]]>
			</body>
		</html>`);
		var root = run(doc);
		expect(root.head.color).toBe('red');
		expect(doc.toString()).toBe(`<html>
			<head>
			</head>
			<body class="red">
			</body>
		</html>`);
		root.head.color = 'green';
		expect(doc.toString()).toBe(`<html>
			<head>
			</head>
			<body>
			</body>
		</html>`);
	});

	it("testDotDependency2", () => {
		var doc = HtmlParser.parse(`<html>
			<head :attr-dataNote="color is [[body.color]]">
			</head>
			<body :color="red">
			</body>
		</html>`);
		var root = run(doc);
		expect(root.body.color).toBe('red');
		expect(doc.toString()).toBe(`<html>
			<head data-note="color is red">
			</head>
			<body>
			</body>
		</html>`);
		root.body.color = 'green';
		expect(doc.toString()).toBe(`<html>
			<head data-note="color is green">
			</head>
			<body>
			</body>
		</html>`);
	});

	it("testDotDependency3", () => {
		var doc = HtmlParser.parse(`<html>
			<head :attr-dataNote="color is [[body.color]]">
				<style :aka="style" :attr-dataNote="color is [[body.color]]"></style>
			</head>
			<body :color="red">
			</body>
		</html>`);
		var root = run(doc);
		expect(root.body.color).toBe('red');
		expect(doc.toString()).toBe(`<html>
			<head data-note="color is red">
				<style data-note="color is red"></style>
			</head>
			<body>
			</body>
		</html>`);
		root.body.color = 'green';
		expect(doc.toString()).toBe(`<html>
			<head data-note="color is green">
				<style data-note="color is green"></style>
			</head>
			<body>
			</body>
		</html>`);
	});

	it("testAnonymousScope", () => {
		var doc = HtmlParser.parse(`<html>
			<head>
				<style :attr-dataNote="color is [[body.color]]"></style>
			</head>
			<body :color="red">
			</body>
		</html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html>
			<head>
				<style data-note="color is red"></style>
			</head>
			<body>
			</body>
		</html>`);
		root.body.color = 'green';
		expect(doc.toString()).toBe(`<html>
			<head>
				<style data-note="color is green"></style>
			</head>
			<body>
			</body>
		</html>`);
	});

	// =========================================================================
	// class values
	// =========================================================================

	it("testClassValue", () => {
		var doc = HtmlParser.parse(`<html :class-page="true" lang="en">
		</html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html class="page" lang="en">
		</html>`);
		root.class_page = false;
		expect(doc.toString()).toBe(`<html lang="en">
		</html>`);
	});

	// =========================================================================
	// style values
	// =========================================================================

	it("testStyleValue", () => {
		var doc = HtmlParser.parse(`<html :style-display="block">
		</html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html style="display:block;">
		</html>`);
		root.style_display = null;
		expect(doc.toString()).toBe(`<html>
		</html>`);
	});

	// =========================================================================
	// attribute values
	// =========================================================================

	it("testAttrValue", () => {
		var doc = HtmlParser.parse(`<html :attr-lang="en">
		</html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html lang="en">
		</html>`);
		root.attr_lang = null;
		expect(doc.toString()).toBe(`<html>
		</html>`);
	});

	// =========================================================================
	// :hidden
	// =========================================================================

	it("testHidden", () => {
		var doc = HtmlParser.parse(`<html :hidden=[[false]]></html>`);
		var root = run(doc);
		expect(doc.toString()).toBe(`<html></html>`);
		root.class___cerereAutohide = true;
		expect(doc.toString()).toBe(`<html class="__cerere-autohide"></html>`);
	});

	// =========================================================================
	// value handlers
	// =========================================================================

	it("testHandler1", () => {
		var doc = HtmlParser.parse(`<html :name=[["John"]] :other="x" :a=[[0]]
			:on-name=[[a++]]>
		</html>`);
		var root = run(doc);
		expect(root.a).toBe(1);
		root.name = 'Bob';
		expect(root.a).toBe(2);
	});

	it("testHandler2", () => {
		var doc = HtmlParser.parse(`<html :name=[["John"]] :other="x" :z=[[0]]
			:on-name=[[z++]]>
		</html>`);
		var root = run(doc);
		expect(root.z).toBe(1);
		root.name = 'Bob';
		expect(root.z).toBe(2);
	});

	it("testHandler3", () => {
		var doc = HtmlParser.parse(`<html :title=[["John"]] :other="x" :z=[[0]]
			:on-title=[[z = z + 1]]>
		</html>`);
		var root = run(doc);
		expect(root.z).toBe(1);
		root.title = 'Bob';
		expect(root.z).toBe(2);
	});

	// =========================================================================
	// event handlers
	// =========================================================================

	it("testEventHandler1", () => {
		var doc = HtmlParser.parse(`<html>
			<body :event-click=[[function(ev) {console.log(ev);}]]></body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(rt[0].evhandlers.length).toBe(1);
		expect(rt[0].evhandlers[0].e).toBe(root.body.__dom);
		expect(rt[0].evhandlers[0].t).toBe('click');
	});

	it("testEventHandler1b", () => {
		var doc = HtmlParser.parse(`<html>
			<body :event-click=[[(ev) => console.log(ev)]]></body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(rt[0].evhandlers.length).toBe(1);
		expect(rt[0].evhandlers[0].e).toBe(root.body.__dom);
		expect(rt[0].evhandlers[0].t).toBe('click');
	});

	it("testEventHandler2", () => {
		var doc = HtmlParser.parse(`<html>
			<body :event-document:click=[[function(ev) {console.log(ev);}]]></body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(rt[0].evhandlers.length).toBe(1);
		expect(rt[0].evhandlers[0].e).toBe(root.__doc);
		expect(rt[0].evhandlers[0].t).toBe('click');
	});

	it("testEventHandler3", () => {
		var doc = HtmlParser.parse(`<html>
			<body :event-window:click=[[function(ev) {console.log(ev);}]]></body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(rt[0].evhandlers.length).toBe(1);
		expect(rt[0].evhandlers[0].e).toBe(rt[0].page.window);
		expect(rt[0].evhandlers[0].t).toBe('click');
	});

});

function run(doc:HtmlDocument, ret?:Array<RuntimeObj>, dump=false): any {
	var app = new App(doc);
	var page = app.output();
	var rt = make(page);
	var script = `(${page.script})(rt)`;
	if (dump) {
		console.log(script);
	}
	var root = eval(script);
	rt.start();
	ret ? ret.push(rt) : null;
	return root;
}
