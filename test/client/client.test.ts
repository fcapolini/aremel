import AremelClient from "../../src/client/client";
import { HtmlDocument } from "../../src/compiler/htmldom";
import Preprocessor from "../../src/compiler/preprocessor";
import { normalizeText } from "../../src/compiler/util";
import AramelServer from "../../src/server/server";
import { DomDocument } from "../../src/shared/dom";

let prepro: Preprocessor;

describe("test client", () => {

	beforeAll(() => {
		prepro = new Preprocessor(process.cwd() + '/test/client/pages');
	});

	it("should load page1.html", () => {
		var client = load('page1.html');
		expect(client).toBeDefined();
	});

	it("should load page2.html", () => {
		var client = load('page2.html');
		var doc:HtmlDocument = client.pageObj.doc as unknown as HtmlDocument;
		expect(doc).toBeDefined();
		var html = doc.firstElementChild;
		expect(html?.getAttribute('lang')).toBe('en');
		client.root.l = 'es';
		expect(html?.getAttribute('lang')).toBe('es');
	});

	it("should load page3.html", () => {
		var client = load('page3.html');
		var doc:HtmlDocument = client.pageObj.doc as unknown as HtmlDocument;
		expect(doc).toBeDefined();
		expect(normalizeText(doc.toString(true))).toBe(normalizeText(`<html data-aremel="0">
			<head data-aremel="1"></head>
			<body data-aremel="2">
				<div data-aremel="3" data-aremel-i="0">a</div><div data-aremel="3" data-aremel-i="1">b</div><div data-aremel="3">c</div>
			</body>
		</html>`));
	});

});

function load(fname:string): AremelClient {
	var url = new URL('http://localhost/' + fname);
	var doc = AramelServer.getPage(prepro, url);
	var win = {
		addEventListener: (t:string,h:any)=>{},
		removeEventListener: (t:string,h:any)=>{},
	};
	var client = new AremelClient(doc as unknown as DomDocument, win, true);
	// expect(client.pageObj.nodes.length).toBe(3);
	expect(client.runtime).toBeDefined();
	// var code = getScript(doc as unknown as DomDocument);
	var code = client.pageObj.script;
	expect(code).toBeDefined();
	var window:any = {};
	eval(code as unknown as string);
	expect(window.__aremel).toBeDefined();
	client.root = window.__aremel(client.runtime);
	expect(client.root).toBeDefined();
	client.runtime.start();
	return client;
}
