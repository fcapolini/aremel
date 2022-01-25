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
				<style :aka="style" :attr-dataNote="color is [[body.color]]"/>
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
				<style :attr-dataNote="color is [[body.color]]"/>
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
		root.class_aremelAutohide = true;
		expect(doc.toString(true)).toBe(`<html class="aremel-autohide" data-aremel="0"></html>`);
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
			<body class="aremel-autohide" data-aremel="1">&zwnj;</body>
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

	it("testReplication2", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="data">
				<div :aka="theDiv" :data=[[ ["a", "b", "c"] ]]>[[label]]: [[data]]</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: a</div><div data-aremel="2" data-aremel-i="1">data: b</div><div data-aremel="2">data: c</div>
			</body>
		</html>`);
		expect(root.body.__value_label.observers.length).toBe(3);
		root.body.label = 'letter';
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">letter: a</div><div data-aremel="2" data-aremel-i="1">letter: b</div><div data-aremel="2">letter: c</div>
			</body>
		</html>`);
		root.body.theDiv.data = ["l", "m", "n"];
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">letter: l</div><div data-aremel="2" data-aremel-i="1">letter: m</div><div data-aremel="2">letter: n</div>
			</body>
		</html>`);
	});

	it("testReplication3", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[ {list:["a", "b", "c"]} ]]>
				<div :aka="theDiv" :data=[[data.list]]>[[label]]: [[data]]</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: a</div><div data-aremel="2" data-aremel-i="1">data: b</div><div data-aremel="2">data: c</div>
			</body>
		</html>`);
		expect(root.body.__value_label.observers.length).toBe(3);
		root.body.label = 'letter';
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">letter: a</div><div data-aremel="2" data-aremel-i="1">letter: b</div><div data-aremel="2">letter: c</div>
			</body>
		</html>`);
		root.body.data = {list:["l", "m", "n"]};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">letter: l</div><div data-aremel="2" data-aremel-i="1">letter: m</div><div data-aremel="2">letter: n</div>
			</body>
		</html>`);
	});

	it("testReplication4", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[ {list:["a", "b", "c"]} ]]>
				<div :aka="theDiv" :data=[[data.list]]>[[label]]: [[data]]</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(root.body.__value_label.observers.length).toBe(3);
		root.body.data = {list:["l", "m"]};
		expect(root.body.__value_label.observers.length).toBe(2);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: l</div><div data-aremel="2">data: m</div>
			</body>
		</html>`);
	});

	// =========================================================================
	// replication: deep cloning
	// =========================================================================

	it("testCloning1", () => {
		/*
		the cloned scope doesn't have child scopes
		*/
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[{list:["a", "b"]}]]>
				<div :aka="theDiv" :data=[[data.list]]>
					<span>[[label]]: [[data]]</span>
				</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">
					<span>data: a</span>
				</div><div data-aremel="2">
					<span>data: b</span>
				</div>
			</body>
		</html>`);
	});

	it("testCloning2", () => {
		/*
		the cloned scope has a nested scope (forced by span's `aka` attribute)
		*/
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[{list:["a", "b"]}]]>
				<div :aka="theDiv" :data=[[data.list]]>
					<span :aka="theSpan">[[label]]: [[data]]</span>
				</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">
					<span data-aremel="3">data: a</span>
				</div><div data-aremel="2">
					<span data-aremel="3">data: b</span>
				</div>
			</body>
		</html>`);
	});

	it("testCloning3", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="letter" :data="[[{list:['a', 'b']}]]">
				<ul>
					<li :data=[[data.list]]>[[label]]: [[data]]</li>
				</ul>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<ul>
					<li data-aremel="2" data-aremel-i="0">letter: a</li><li data-aremel="2">letter: b</li>
				</ul>
			</body>
		</html>`);
	});

	// =========================================================================
	// replication: nesting
	// =========================================================================

	it("testNestedReplication1", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[{
				lists: [
					{id:"a", list:[1,2]},
					{id:"b", list:[3,4,5]}
				]
			}]]>
				<div :aka="theDiv" :data=[[data.lists]]>
					<p>[[data.id]]</p>
					<span :aka="theSpan" :data=[[data.list]]>[[label]]: [[data]]</span>
				</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">
					<p data-aremel="3">a</p>
					<span data-aremel="4" data-aremel-i="0">data: 1</span><span data-aremel="4">data: 2</span>
				</div><div data-aremel="2">
					<p data-aremel="3">b</p>
					<span data-aremel="4" data-aremel-i="0">data: 3</span><span data-aremel="4" data-aremel-i="1">data: 4</span><span data-aremel="4">data: 5</span>
				</div>
			</body>
		</html>`);
		expect(root.body.__value_label.observers.length).toBe(5);
		root.body.data = {
			lists: [
				{id:"x", list:[1,2]},
				{id:"y", list:[3]}
			]
		};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">
					<p data-aremel="3">x</p>
					<span data-aremel="4" data-aremel-i="0">data: 1</span><span data-aremel="4">data: 2</span>
				</div><div data-aremel="2">
					<p data-aremel="3">y</p>
					<span data-aremel="4">data: 3</span>
				</div>
			</body>
		</html>`);
		expect(root.body.__value_label.observers.length).toBe(3);
		root.body.label = 'number';
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">
					<p data-aremel="3">x</p>
					<span data-aremel="4" data-aremel-i="0">number: 1</span><span data-aremel="4">number: 2</span>
				</div><div data-aremel="2">
					<p data-aremel="3">y</p>
					<span data-aremel="4">number: 3</span>
				</div>
			</body>
		</html>`);
	});

	// =========================================================================
	// replication: :data-offset, :data-length
	// =========================================================================

	it("testReplicationOffset", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[{list:["a", "b", "c", "d"]}]]>
				<div :aka="theDiv"
					:data=[[data.list]]
					:dataOffset=[[0]]
				>[[label]]: [[data]]</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: a</div><div data-aremel="2" data-aremel-i="1">data: b</div><div data-aremel="2" data-aremel-i="2">data: c</div><div data-aremel="2">data: d</div>
			</body>
		</html>`);
		expect(root.body.__value_label.observers.length).toBe(4);
		root.body.theDiv.dataOffset = 2;
		expect(root.body.__value_label.observers.length).toBe(2);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: c</div><div data-aremel="2">data: d</div>
			</body>
		</html>`);
	});

	it("testReplicationLength", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[{list:["a", "b", "c", "d"]}]]>
				<div :aka="theDiv"
					:data=[[data.list]]
					:dataLength=[[-1]]
				>[[label]]: [[data]]</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: a</div><div data-aremel="2" data-aremel-i="1">data: b</div><div data-aremel="2" data-aremel-i="2">data: c</div><div data-aremel="2">data: d</div>
			</body>
		</html>`);
		expect(root.body.__value_label.observers.length).toBe(4);
		root.body.theDiv.dataLength = 2;
		expect(root.body.__value_label.observers.length).toBe(2);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: a</div><div data-aremel="2">data: b</div>
			</body>
		</html>`);
	});

	it("testReplicationOffsetLength1", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[{list:["a", "b", "c", "d"]}]]>
				<div :aka="theDiv"
					:data=[[data.list]]
					:dataOffset=[[0]]
					:dataLength=[[-1]]
				>[[label]]: [[data]]</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: a</div><div data-aremel="2" data-aremel-i="1">data: b</div><div data-aremel="2" data-aremel-i="2">data: c</div><div data-aremel="2">data: d</div>
			</body>
		</html>`);
		expect(root.body.__value_label.observers.length).toBe(4);
		root.body.theDiv.dataOffset = 1;
		root.body.theDiv.dataLength = 2;
		expect(root.body.__value_label.observers.length).toBe(2);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: b</div><div data-aremel="2">data: c</div>
			</body>
		</html>`);
	});

	it("testReplicationOffsetLength2", () => {
		var doc = HtmlParser.parse(`<html>
			<body :label="data" :data=[[{list:["a", "b", "c", "d"]}]]>
				<div :aka="theDiv" :data=[[data.list]]
				>[[label]]: [[data]]</div>
			</body>
		</html>`);
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: a</div><div data-aremel="2" data-aremel-i="1">data: b</div><div data-aremel="2" data-aremel-i="2">data: c</div><div data-aremel="2">data: d</div>
			</body>
		</html>`);
		expect(root.body.__value_label.observers.length).toBe(4);
		root.body.theDiv.dataOffset = 1;
		root.body.theDiv.dataLength = 2;
		expect(root.body.__value_label.observers.length).toBe(2);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2" data-aremel-i="0">data: b</div><div data-aremel="2">data: c</div>
			</body>
		</html>`);
	});

});

function run(doc:HtmlDocument, ret?:Array<RuntimeObj>, dump=false): any {
	var app = new App(new URL('http://localhost/'), doc);
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
