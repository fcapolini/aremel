import HtmlParser, { HtmlException } from "../../src/compiler/htmlparser";
import App, { AppError } from "../../src/compiler/app";

let rootPath:string;

describe("test server app", () => {

	beforeAll(() => {
		rootPath = process.cwd() + '/test/compiler/app';
	});

	it("should load <html></html>", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html></html>');
			var app = new App(doc);
			expect(app.root).toBeDefined();
			expect(app.root.dom).toBe(doc.getFirstElementChild());
			//TODO
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});
});
