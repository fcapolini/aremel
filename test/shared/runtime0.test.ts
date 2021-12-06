import App from "../../src/compiler/app";
import { HtmlDocument } from "../../src/compiler/htmldom";
import HtmlParser from "../../src/compiler/htmlparser";
import { make, RuntimeObj } from "../../src/shared/runtime";

/*
	original tests from previous version "aremel"
*/
describe("test runtime", () => {

	// =========================================================================
	// expressions
	// =========================================================================

	it("testLiteralValue", () => {
		var doc = HtmlParser.parse(`<html :title="Foo" lang="en">
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0" lang="en">
		</html>`);
		expect(root.title).toBe('Foo');
	});

	it("testSimpleExpressionValue", () => {
		var doc = HtmlParser.parse(`<html :title=[["Foo"]] lang="en">
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0" lang="en">
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
		expect(doc.toString(true)).toBe(`<html data-aremel="0" lang="en">
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
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
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
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1">
			</head>
			<body class="red" data-aremel="2">
			</body>
		</html>`);
		root.head.color = 'green';
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1">
			</head>
			<body data-aremel="2">
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
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1" data-note="color is red">
			</head>
			<body data-aremel="2">
			</body>
		</html>`);
		root.body.color = 'green';
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1" data-note="color is green">
			</head>
			<body data-aremel="2">
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
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1" data-note="color is red">
				<style data-aremel="2" data-note="color is red"></style>
			</head>
			<body data-aremel="3">
			</body>
		</html>`);
		root.body.color = 'green';
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1" data-note="color is green">
				<style data-aremel="2" data-note="color is green"></style>
			</head>
			<body data-aremel="3">
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
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1">
				<style data-aremel="2" data-note="color is red"></style>
			</head>
			<body data-aremel="3">
			</body>
		</html>`);
		root.body.color = 'green';
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1">
				<style data-aremel="2" data-note="color is green"></style>
			</head>
			<body data-aremel="3">
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
		expect(doc.toString(true)).toBe(`<html class="page" data-aremel="0" lang="en">
		</html>`);
		root.class_page = false;
		expect(doc.toString(true)).toBe(`<html data-aremel="0" lang="en">
		</html>`);
	});

	// =========================================================================
	// style values
	// =========================================================================

	it("testStyleValue", () => {
		var doc = HtmlParser.parse(`<html :style-display="block">
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0" style="display:block;">
		</html>`);
		root.style_display = null;
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
		</html>`);
	});

	// =========================================================================
	// attribute values
	// =========================================================================

	it("testAttrValue", () => {
		var doc = HtmlParser.parse(`<html :attr-lang="en">
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0" lang="en">
		</html>`);
		root.attr_lang = null;
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
		</html>`);
	});

	// =========================================================================
	// :hidden
	// =========================================================================

	it("testHidden", () => {
		var doc = HtmlParser.parse(`<html :hidden=[[false]]></html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0"></html>`);
		root.class___aremelAutohide = true;
		expect(doc.toString(true)).toBe(`<html class="__aremel-autohide" data-aremel="0"></html>`);
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

	// =========================================================================
	// text values
	// =========================================================================

	it("testText1", () => {
		var doc = HtmlParser.parse(`<html :name="Bob">[[name]]</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe('<html data-aremel="0">Bob</html>');
		root.name = 'Alice';
		expect(doc.toString(true)).toBe('<html data-aremel="0">Alice</html>');
	});

	it("testText2", () => {
		var doc = HtmlParser.parse(`<html :name="Bob"><body>[[name]]</body></html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe('<html data-aremel="0"><body data-aremel="1">Bob</body></html>');
		root.name = 'Alice';
		expect(doc.toString(true)).toBe('<html data-aremel="0"><body data-aremel="1">Alice</body></html>');
	});

	it("testText3", () => {
		var doc = HtmlParser.parse(`<html :name="Bob"><body>
			<h1>Message</h1>
			<div>
				<span>Hi</span>
				[[name]]
			</div>
		</body></html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0"><body data-aremel="1">
			<h1>Message</h1>
			<div>
				<span>Hi</span>
				Bob
			</div>
		</body></html>`);
		root.name = 'Alice';
		expect(doc.toString(true)).toBe(`<html data-aremel="0"><body data-aremel="1">
			<h1>Message</h1>
			<div>
				<span>Hi</span>
				Alice
			</div>
		</body></html>`);
	});

	// =========================================================================
	// method values
	// =========================================================================

	it("testMethod1", () => {
		var doc = HtmlParser.parse(`<html :add=[[function(a, b) {return a + b;}]]>
			<body>[[add(1, 2)]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">3</body>
		</html>`);
	});

	it("testMethod2", () => {
		var doc = HtmlParser.parse(`<html :add=[[ function (a, b) { return a + b; } ]]>
			<body>[[add(1, 2)]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">3</body>
		</html>`);
	});

	it("testMethod2b", () => {
		var doc = HtmlParser.parse(`<html :add=[[ function (a, b) { return a + b } ]]>
			<body>[[add(1, 2)]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">3</body>
		</html>`);
	});

	it("testMethod2c", () => {
		var doc = HtmlParser.parse(`<html :add=[[ (a, b) => { return a + b; } ]]>
			<body>[[add(1, 2)]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">3</body>
		</html>`);
	});

	it("testMethod2d", () => {
		var doc = HtmlParser.parse(`<html :add=[[ (a, b) => a + b ]]>
			<body>[[add(1, 2)]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">3</body>
		</html>`);
	});

	it("testMethod3", () => {
		var doc = HtmlParser.parse(`<html>
			<body :add=[[function(a, b) {return a + b;}]]>[[add(1, 2)]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">3</body>
		</html>`);
	});

	it("testMethod4", () => {
		var doc = HtmlParser.parse(`<html :a=[[1]]>
			<head></head><body :a=[[2]] :add=[[function(b) {return a + b;}]]>[[add(2)]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1"></head><body data-aremel="2">4</body>
		</html>`);
	});

	it("testMethod5", () => {
		var doc = HtmlParser.parse(`<html :a=[[1]] :add=[[function(b) {return a + b;}]]>
			<body :a=[[2]]>[[add(2)]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">3</body>
		</html>`);
	});

	// =========================================================================
	// data binding
	// =========================================================================

	it("testDataBinding1", () => {
		var doc = HtmlParser.parse(`<html :data=[[{"name":"Bob"}]]>
			<body>Hello [[ data["name"] ]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello Bob</body>
		</html>`);
		root.data = {"name": "Jane"};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello Jane</body>
		</html>`);
	});

	it("testDataBinding2", () => {
		var doc = HtmlParser.parse(`<html :data=[[{"name":"Bob"}]]>
			<body>Hello [[data.name]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello Bob</body>
		</html>`);
		root.data = {"name": "Jane"};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello Jane</body>
		</html>`);
	});

	/**
	 * data context refinement: expressions inside a `:data` attribute have
	 * references to `data` replaced with references to outer `data` value
	 * (this is true for any value that refers to itself in its own expression)
	 */
	it("testDataBinding3", () => {
		var doc = HtmlParser.parse(`<html :data=[[{"info":{"name":"Bob"}}]]>
			<body :data=[[data.info]]>Hello [[data.name]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello Bob</body>
		</html>`);
		root.data = {"info":{"name":"Jane"}};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello Jane</body>
		</html>`);
	});

	it("testDataBinding4", () => {
		var doc = HtmlParser.parse(`<html :data=[[{"info":{"name":"Bob"}}]]>
			<body :data=[[data.info]]>Hello [[data.x]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello </body>
		</html>`);
		root.data = {"info":{"x":"Jane"}};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello Jane</body>
		</html>`);
	});

	it("testDataBindingAutoHide", () => {
		var doc = HtmlParser.parse(`<html :data=[[{"x":{"name":"Bob"}}]]>
			<body :data=[[data.info]]>Hello [[data.name]]</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body class="__aremel-autohide" data-aremel="1"></body>
		</html>`);
		root.data = {"info":{"name":"Jane"}};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">Hello Jane</body>
		</html>`);
	});

	// =========================================================================
	// replication
	// =========================================================================

	it("testReplication1", () => {
		var doc = HtmlParser.parse(`<html>
			<body>
				<div :data=[[ ["a", "b", "c"] ]]>[[data]]</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">a</div><div data-aremel="2" data-aremel-i="1">b</div><div data-aremel="2">c</div>
			</body>
		</html>`);
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
