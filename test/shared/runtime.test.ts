import App from "../../src/compiler/app";
import { HtmlDocument } from "../../src/compiler/htmldom";
import HtmlParser from "../../src/compiler/htmlparser";
import { make, RuntimeObj } from "../../src/shared/runtime";

describe("test runtime", () => {

	it("should load <html><body/></html>", () => {
		var doc = HtmlParser.parse('<html><body/></html>');
		var root = run(doc);
		expect(root.__dom.tagName).toBe('HTML');
	});

	it("should load <html :v1=[[1]]><body :v2=[[v1 * 2]]/></html>", () => {
		var doc = HtmlParser.parse('<html :v1=[[1]]><body :v2=[[v1 * 2]]/></html>');
		var root = run(doc);
		expect(root.__dom.tagName).toBe('HTML');
		var v1 = root.v1;
		expect(v1).toBe(1);
		var v2 = root.body.v2;
		expect(v2).toBe(2);
		root.v1++;
		expect(root.body.v2).toBe(4);
	});

	it("should reflect `:class-` attributes", () => {
		var doc = HtmlParser.parse('<html :class-page=[[true]]/>');
		var root = run(doc);
		expect(doc.toString(true)).toBe('<html class="page" data-aremel="0"></html>');
		root.class_page = false;
		expect(doc.toString(true)).toBe('<html data-aremel="0"></html>');
	});

	it("should reflect `:style-` attributes", () => {
		var doc = HtmlParser.parse('<html :style-display="block"/>');
		var root = run(doc);
		expect(doc.toString(true)).toBe('<html data-aremel="0" style="display:block;"></html>');
		root.style_display = null;
		expect(doc.toString(true)).toBe('<html data-aremel="0"></html>');
	});

	it("should reflect DOM attributes", () => {
		var doc = HtmlParser.parse('<html id=[["page"]]/>');
		var root = run(doc);
		expect(doc.toString(true)).toBe('<html data-aremel="0" id="page"></html>');
		root.attr_id = null;
		expect(doc.toString(true)).toBe('<html data-aremel="0"></html>');
	});

	it("should call value handlers", () => {
		var doc = HtmlParser.parse('<html :v0=[[0]] :v1=[[1]] :v2="" :on-v1=[[v2 = v0 + v1 * 2]]/>');
		var root = run(doc);
		expect(root.v2).toBe(2);
		root.v1 = 3;
		expect(root.v2).toBe(6);
		root.v0 = 10;
		// v0 shouldn't trigger on-v1 handler execution
		expect(root.v2).toBe(6);
	});

	it("should reflect texts", () => {
		var doc = HtmlParser.parse('<html :v=[["Bob"]]>Hello [[v]].</html>');
		var root = run(doc);
		expect(doc.toString(true)).toBe('<html data-aremel="0">Hello Bob.</html>');
		root.v = null;
		expect(doc.toString(true)).toBe('<html data-aremel="0">Hello .</html>');
	});

	it("should add event listeners", () => {
		var doc = HtmlParser.parse('<html :event-click=[[(ev) => console.log(ev)]]/>');
		var rt = new Array<RuntimeObj>();
		var root = run(doc, rt);
		expect(doc.toString(true)).toBe('<html data-aremel="0"></html>');
		expect(rt[0].evhandlers.length).toBe(1);
		expect(rt[0].evhandlers[0].t).toBe('click');
	});

	it("should support data-binding", () => {
		var doc = HtmlParser.parse(`<html>
			<body :data=[[{name:"Bob"}]]>
				<span>Hello [[data.name]].</span>
			</body>
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<span>Hello Bob.</span>
			</body>
		</html>`);
		root.body.data = {name:"Alice"};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<span>Hello Alice.</span>
			</body>
		</html>`);
		root.body.data = {x:""};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<span>Hello .</span>
			</body>
		</html>`);
		root.body.data = null;
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body class="__aremel-autohide" data-aremel="1">
				<span>Hello .</span>
			</body>
		</html>`);
	});

	it("should support scope referencing (1)", () => {
		var doc = HtmlParser.parse(`<html>
			<head :v1="10"/>
			<body :v2=[[head.v1]]>[[v2]] == [[head.v1]]</body>
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<head data-aremel="1"></head>
			<body data-aremel="2">10 == 10</body>
		</html>`);
	});

	it("should support scope referencing (2)", () => {
		var doc = HtmlParser.parse(`<html>
			<body>
				<div :aka="foo" :v1=[[11]]/>
				<div :v2=[[foo.v1]]>[[v2]] == [[foo.v1]]</div>
			</body>
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2"></div>
				<div data-aremel="3">11 == 11</div>
			</body>
		</html>`);
	});

	//TODO: OK dover mettere le tonde intorno all'object literal in v1?
	it("should support partial scope referencing", () => {
		var doc = HtmlParser.parse(`<html>
			<body>
				<div :aka="foo" :v1=[[({x:{y:11}})]]/>
				<div :v2=[[body.foo.v1.x.y]]>[[v2]] == [[body.foo.v1.x.y]]</div>
			</body>
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2"></div>
				<div data-aremel="3">11 == 11</div>
			</body>
		</html>`);
		root.body.foo.v1 = {x:{y:12}};
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<div data-aremel="2"></div>
				<div data-aremel="3">12 == 12</div>
			</body>
		</html>`);
	});

	it("should support data sources", () => {
		var doc = HtmlParser.parse(`<html>
			<body>
				<script
					:url=""
					:type="text/json"
					:post=[[false]]

					type=[[type]]
					:on-url="[[
						__rt.addRequest({
							url:url, type:type, target:__this.__value_content,
							post:post, scriptElement:__this.__dom
						})
					]]"
					:content=[[undefined]]
				></script>
			</body>
		</html>`);
		var root = run(doc);
		expect(doc.toString(true)).toBe(`<html data-aremel="0">
			<body data-aremel="1">
				<script data-aremel="2" type="text/json"></script>
			</body>
		</html>`);
	});

});

function run(doc:HtmlDocument, rtret?:Array<RuntimeObj>, dump=false): any {
	var app = new App(doc);
	var page = app.output();
	var rt = make(page);
	rtret ? rtret.push(rt) : null;
	if (dump) {
		console.log(page.script);
	}
	var root = eval(`(${page.script})(rt)`);
	rt.start();
	return root;
}
