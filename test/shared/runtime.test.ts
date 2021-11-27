import App from "../../src/compiler/app";
import HtmlParser from "../../src/compiler/htmlparser";
import { make } from "../../src/shared/runtime";

describe("test runtime", () => {

	it("should load <html><body/></html>", () => {
		var doc = HtmlParser.parse('<html><body/></html>');
		var app = new App(doc);
		var page = app.output();
		var rt = make(page);
		var root = eval(`(${page.script})(rt)`);
		expect(root.__dom.tagName).toBe('HTML');
	});

	it("should load <html :v1=[[1]]><body :v2=[[v1 * 2]]/></html>", () => {
		var doc = HtmlParser.parse('<html :v1=[[1]]><body :v2=[[v1 * 2]]/></html>');
		var app = new App(doc);
		var page = app.output();
		var rt = make(page);
		var root = eval(`(${page.script})(rt)`);
		rt.start();
		expect(root.__dom.tagName).toBe('HTML');
		var v1 = root.v1;
		expect(v1).toBe(1);
		var v2 = root.body.v2;
		expect(v2).toBe(2);
		root.v1++;
		expect(root.body.v2).toBe(4);
	});

});
