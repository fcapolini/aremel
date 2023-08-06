import { assert } from "chai";
import AremelClient from "../../src/client/client";
import Compiler from "../../src/compiler/compiler";
import { HtmlDocument } from "../../src/compiler/htmldom";
import HtmlParser from "../../src/compiler/htmlparser";
import Preprocessor from "../../src/compiler/preprocessor";
import { DomDocument } from "../../src/shared/dom";
import { CSS_AUTOHIDE_CLASS, RuntimeWindow } from "../../src/shared/runtime";
import { normalizeText } from "../../src/shared/util";

let rootPath = process.cwd() + '/test/client/pages';

describe("test client", () => {

	it("should load page1.html", (done) => {
		load('page1.html', client => {
      assert.isDefined(client);
			done();
		});
	});

	it("should load page2.html", (done) => {
		load('page2.html', client => {
			var doc:HtmlDocument = client.pageObj.doc as unknown as HtmlDocument;
      assert.isDefined(doc);
			var html = doc.firstElementChild;
      assert.equal(html?.getAttribute('lang'), 'en');
			client.root.l = 'es';
      assert.equal(html?.getAttribute('lang'), 'es');
			done();
		});
	});

	it("should load page3.html", (done) => {
		load('page3.html', client => {
			var doc:HtmlDocument = client.pageObj.doc as unknown as HtmlDocument;
      assert.isDefined(doc);
			assert.equal(normalizeText(doc.toString(true)), normalizeText(`<html data-aremel="0">
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
	var prepro = new Preprocessor(rootPath);
	Compiler.getPage(prepro, url.toString(), (html, _) => {
		var win:RuntimeWindow = {
			addEventListener: (t:string,h:any)=>{},
			removeEventListener: (t:string,h:any)=>{},
			location: {toString: () => 'http://localhost/'},
		};
		var doc = HtmlParser.parse(html);
		var client = new AremelClient(doc as unknown as DomDocument, win, true);
    assert.isDefined(client.runtime);
    assert.isDefined(win.__aremel);
    assert.isDefined(client.root);
		cb(client);
	}, (err) => {
    assert.isUndefined(err);
	});
}
