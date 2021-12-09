import AremelClient from "../../src/client/client";
import { CSS_AUTOHIDE_CLASS } from "../../src/compiler/app";
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

	it("should load page1.html", (done) => {
		load('page1.html', client => {
			expect(client).toBeDefined();
			done();
		});
	});

	it("should load page2.html", (done) => {
		load('page2.html', client => {
			var doc:HtmlDocument = client.pageObj.doc as unknown as HtmlDocument;
			expect(doc).toBeDefined();
			var html = doc.firstElementChild;
			expect(html?.getAttribute('lang')).toBe('en');
			client.root.l = 'es';
			expect(html?.getAttribute('lang')).toBe('es');
			done();
		});
	});

	it("should load page3.html", (done) => {
		load('page3.html', client => {
			var doc:HtmlDocument = client.pageObj.doc as unknown as HtmlDocument;
			expect(doc).toBeDefined();
			expect(normalizeText(doc.toString(true))).toBe(normalizeText(`<html data-aremel="0">
				<head data-aremel="1">
					<style data-name="aremel">
						.${CSS_AUTOHIDE_CLASS} {
							display: none;
						}
					</style>
				</head>
				<body data-aremel="2">
					<div data-aremel="3" data-aremel-i="0">a</div><div data-aremel="3" data-aremel-i="1">b</div><div data-aremel="3">c</div>
				</body>
			</html>`));
			done();
		});
	});

});

function load(fname:string, cb:(client:AremelClient)=>void) {
	var url = new URL('http://localhost/' + fname);
	AramelServer.getPage(prepro, url, (doc) => {
		var win:any = {
			addEventListener: (t:string,h:any)=>{},
			removeEventListener: (t:string,h:any)=>{},
		};
		var client = new AremelClient(doc as unknown as DomDocument, win, true);
		expect(client.runtime).toBeDefined();
		expect(win.__aremel).toBeDefined();
		expect(client.root).toBeDefined();
		cb(client);
	});
}
