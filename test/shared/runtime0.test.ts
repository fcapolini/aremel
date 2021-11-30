import App from "../../src/compiler/app";
import { HtmlDocument } from "../../src/compiler/htmldom";
import HtmlParser from "../../src/compiler/htmlparser";
import { make } from "../../src/shared/runtime";

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

});

function run(doc:HtmlDocument, dump=false): any {
	var app = new App(doc);
	var page = app.output();
	var rt = make(page);
	var script = `(${page.script})(rt)`;
	if (dump) {
		console.log(script);
	}
	var root = eval(script);
	rt.start();
	return root;
}
