import { assert } from "console";
import AremelClient from "../../src/client/client";
import { HtmlDocument, HtmlElement, HtmlText } from "../../src/compiler/htmldom";
import Preprocessor from "../../src/compiler/preprocessor";
import AramelServer from "../../src/server/server";
import { DomDocument, DomElement, ELEMENT_NODE } from "../../src/shared/dom";

let prepro: Preprocessor;

describe("test client", () => {

	beforeAll(() => {
		prepro = new Preprocessor(process.cwd() + '/test/client/pages');
	});

	it("should load page1.html", () => {
		var root = load('page1.html');
	});

	it("should load page2.html", () => {
		var root = load('page2.html');
		var doc:HtmlDocument = root.__doc;
		expect(doc).toBeDefined();
		var html = doc.firstElementChild;
		expect(html.getAttribute('lang')).toBe('en');
		root.l = 'es';
		expect(html.getAttribute('lang')).toBe('es');
	});

});

function load(fname:string): any {
	var url = new URL('http://localhost/' + fname);
	var doc = AramelServer.getPage(prepro, url);
	var win = {
		addEventListener: (t:string,h:any)=>{},
		removeEventListener: (t:string,h:any)=>{},
	};
	var client = new AremelClient(doc as unknown as DomDocument, win);
	expect(client.pageObj.nodes.length).toBe(3);
	expect(client.runtime).toBeDefined();
	var script = getScript(doc as unknown as DomDocument);
	expect(script).toBeDefined();
	var window:any = {};
	eval(script as unknown as string);
	expect(window.__aremel).toBeDefined();
	var root = window.__aremel(client.runtime);
	expect(root).toBeDefined();
	client.runtime.start();
	return root;
}

function getScript(doc:DomDocument): string|undefined {
	var html:DomElement|undefined = doc.firstElementChild;
	var script:string|undefined = undefined;
	html?.childNodes.forEach((n, i) => {
		if (n.nodeType === ELEMENT_NODE) {
			if ((n as DomElement).tagName === 'BODY') {
				(n as DomElement).childNodes.forEach((n, i) => {
					if ((n as DomElement).tagName === 'SCRIPT') {
						if (!(n as DomElement).getAttribute('src')) {
							script = ((n as unknown as HtmlElement).children[0] as HtmlText).nodeValue;
						}
					}
				});
			}
		}
	});
	return script;
}