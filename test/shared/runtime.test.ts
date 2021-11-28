import App from "../../src/compiler/app";
import { HtmlDocument } from "../../src/compiler/htmldom";
import HtmlParser from "../../src/compiler/htmlparser";
import { make } from "../../src/shared/runtime";

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
		expect(doc.toString()).toBe('<html class="page"></html>');
		root.class_page = false;
		expect(doc.toString()).toBe('<html></html>');
	});

	it("should reflect `:style-` attributes", () => {
		var doc = HtmlParser.parse('<html :style-display="block"/>');
		var root = run(doc);
		expect(doc.toString()).toBe('<html style="display:block;"></html>');
		root.style_display = null;
		expect(doc.toString()).toBe('<html></html>');
	});

	it("should reflect DOM attributes", () => {
		var doc = HtmlParser.parse('<html id=[["page"]]/>');
		var root = run(doc);
		expect(doc.toString()).toBe('<html id="page"></html>');
		root.attr_id = null;
		expect(doc.toString()).toBe('<html></html>');
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

});

function run(doc:HtmlDocument): any {
	var app = new App(doc);
	var page = app.output();
	var rt = make(page);
	var root = eval(`(${page.script})(rt)`);
	rt.start();
	return root;
}