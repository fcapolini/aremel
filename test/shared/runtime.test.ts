import App from "../../src/compiler/app";
import HtmlParser from "../../src/compiler/htmlparser";
import { start } from "../../src/shared/runtime";

describe("test runtime", () => {

	it("should load <html><body/></html>", () => {
		var doc = HtmlParser.parse('<html><body/></html>');
		var app = new App(doc);
		var page = app.output();
		var rt = start(page);
		var root = eval(`(${page.script})(rt)`);
		expect(root.__dom.tagName).toBe('HTML');
	});

	it("should load <html :v1=[[1]]><body :v2=[[v1 * 2]]/></html>", () => {
		var doc = HtmlParser.parse('<html :v1=[[1]]><body :v2=[[v1 * 2]]/></html>');
		var app = new App(doc);
		var page = app.output();
		var rt = start(page);
		var root = eval(`(${page.script})(rt)`);
		expect(root.__dom.tagName).toBe('HTML');
		// var v = root.v1;
		// expect(v).toBe(1);
	});

});
