import { assert } from "@ionic/core/dist/types/utils/helpers";
import App from "../../src/compiler/app";
import HtmlParser from "../../src/compiler/htmlparser";
import { start } from "../../src/shared/runtime";

describe("test runtime", () => {

	it("should load <html><body></body></html>", () => {
		var doc = HtmlParser.parse('<html><body></body></html>');
		var app = new App(doc);
		var page = app.output();
		var rt = start(page);
		var root = eval(`(${page.script})(rt)`);
		// expect(root.__dom.tagName).toBe('HTML');
	});

});
