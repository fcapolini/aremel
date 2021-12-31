import { COMMENT_NODE, ELEMENT_NODE, HtmlDocument, HtmlElement, TEXT_NODE } from "../../src/compiler/htmldom";
import HtmlParser, { HtmlException } from "../../src/compiler/htmlparser";
import fs from "fs";

let rootPath:string;

function countNodes(doc:HtmlDocument): any {
	var ret = {elements: 0, texts:0, comments:0}
	function f(p:HtmlElement) {
		for (var i in p.children) {
			var n = p.children[i];
			if (n.nodeType == ELEMENT_NODE) {
				ret.elements++;
				f(n as HtmlElement);
			} else if (n.nodeType == TEXT_NODE) {
				ret.texts++;
			} else if (n.nodeType == COMMENT_NODE) {
				ret.comments++;
			}
		}
	}
	f(doc);
	return ret;
}

describe("test htmlparser", () => {

	beforeAll(() => {
		rootPath = process.cwd() + '/test/compiler/htmlparser';
	});

	it("should parse <html></html>", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html></html>');
			expect(doc).toBeTruthy();
			expect(doc.tagName).toBe('#DOCUMENT');
			expect(doc.attributes.size).toBe(0);
			expect(doc.children.length).toBe(1);
			expect(doc.children[0].nodeType).toBe(ELEMENT_NODE);
			var e = doc.children[0] as HtmlElement;
			expect(e.tagName).toBe('HTML');
			expect(e.attributes.size).toBe(0);
			expect(e.children.length).toBe(0);
			expect(doc.toString()).toBe('<html></html>');
		} catch (ex:any) {
			msg = (ex instanceof HtmlException ? ex.msg : `${ex}`);
		}
		expect(msg).toBe('');
	});

	it("should parse <html lang=\"en\"></html>", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html lang="en"></html>');
			expect(doc).toBeTruthy();
			expect(doc.tagName).toBe('#DOCUMENT');
			expect(doc.attributes.size).toBe(0);
			expect(doc.children.length).toBe(1);
			expect(doc.children[0].nodeType).toBe(ELEMENT_NODE);
			var e = doc.children[0] as HtmlElement;
			expect(e.tagName).toBe('HTML');
			expect(e.attributes.size).toBe(1);
			expect(e.getAttribute('lang')).toBe('en');
			expect(e.children.length).toBe(0);
			expect(doc.toString()).toBe('<html lang="en"></html>');
		} catch (ex:any) {
			msg = (ex instanceof HtmlException ? ex.msg : `${ex}`);
		}
		expect(msg).toBe('');
	});

	it("should parse a simple page", () => {
		var msg = '';
		try {
			var html = '<html>\n'
					+ '<head>\n'
					+ '<title>\n'
					+ 'A Simple HTML Document\n'
					+ '</title>\n'
					+ '</head>\n'
					+ '<body>\n'
					+ '<p>This is a very simple HTML document</p>\n'
					+ '<p>It only has two paragraphs</p>\n'
					+ '</body>\n'
					+ '</html>';
			var doc = HtmlParser.parse(html);
			expect(doc).toBeTruthy();
			expect(doc.toString()).toBe(html);
		} catch (ex:any) {
			msg = (ex instanceof HtmlException ? ex.msg : `${ex}`);
		}
		expect(msg).toBe('');
	});

	it("should parse <html :lang=\"en\"></html>", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html :lang="en"></html>');
			expect(doc).toBeTruthy();
			expect(doc.tagName).toBe('#DOCUMENT');
			expect(doc.attributes.size).toBe(0);
			expect(doc.children.length).toBe(1);
			expect(doc.children[0].nodeType).toBe(ELEMENT_NODE);
			var e = doc.children[0] as HtmlElement;
			expect(e.tagName).toBe('HTML');
			expect(e.attributes.size).toBe(1);
			expect(e.getAttribute(':lang')).toBe('en');
			expect(e.children.length).toBe(0);
			expect(doc.toString()).toBe('<html :lang="en"></html>');
		} catch (ex:any) {
			msg = (ex instanceof HtmlException ? ex.msg : `${ex}`);
		}
		expect(msg).toBe('');
	});

	it("should parse <html><:mytag/></html>", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html><:mytag/></html>');
			expect(doc.toString()).toBe('<html><:mytag></:mytag></html>');
		} catch (ex:any) {
			msg = (ex instanceof HtmlException ? ex.msg : `${ex}`);
		}
		expect(msg).toBe('');
	});

	it("should parse <html title=[[a[0]]]></html>", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html title=[[a[0]]]></html>');
			expect(doc.toString()).toBe('<html title="a[0]"></html>');
		} catch (ex:any) {
			msg = (ex instanceof HtmlException ? ex.msg : `${ex}`);
		}
		expect(msg).toBe('');
	});

	it("should complain about <html></div>", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html></div>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('literal:1 col 9: Found </DIV> instead of </HTML>');
	});

	it("should complain about <html>", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('literal:1 col 7: expected </HTML>');
	});

	it("should accept empty attribute", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html lang></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should complain about unclosed tag", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html>\n'
			+ '	<body>\n'
			+ '</html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('literal:3 col 3: Found </HTML> instead of </BODY>');
	});

	it("should accept literal array in [[...]] attribute", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse(
				'<div :data=[[ [{list:[1,2]},{list:[\'a\',\'b\']}] ]]></div>'
			);
			var root = doc.getFirstElementChild();
			var v1 = root?.getAttribute(':data');
			var v2 = ' [{list:[1,2]},{list:[\'a\',\'b\']}] ';
			expect(v1).toBe(v2);
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should accept multiline \"...\" attributes", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<div :data="[[ [\n'
					+ '	{list:[1,2]},\n'
					+ '	{list:[\'a\',\'b\']}\n'
					+ '] ]]"></div>');
			var root = doc.getFirstElementChild();
			expect(root?.attributes.get(':data')?.quote).toBe('"');
			var v1 = root?.getAttribute(':data');
			var v2 = '[[ [\n'
					+ '	{list:[1,2]},\n'
					+ '	{list:[\'a\',\'b\']}\n'
					+ '] ]]';
			expect(v1).toBe(v2);
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should accept multiline [[...]] attributes", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<div :data=[[ [\n'
					+ '	{list:[1,2]},\n'
					+ '	{list:[\'a\',\'b\']}\n'
					+ '] ]]></div>');
			var root = doc.getFirstElementChild();
			expect(root?.attributes.get(':data')?.quote).toBe('[');
			var v1 = root?.getAttribute(':data');
			var v2 = ' [\n'
					+ '	{list:[1,2]},\n'
					+ '	{list:[\'a\',\'b\']}\n'
					+ '] ';
			expect(v1).toBe(v2);
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should parse a big file", () => {
		var msg = '';
		try {
			var text = fs.readFileSync(rootPath + '/google.txt', {encoding: 'utf8'});
			var doc = HtmlParser.parse(text);
			expect(doc).toBeTruthy();
			var counts = countNodes(doc);
			expect(counts.elements).toBe(148);
			expect(counts.texts).toBe(267);
			expect(counts.comments).toBe(0);
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should parse html5-test-page.html", () => {
		var msg = '';
		try {
			var text = fs.readFileSync(rootPath + '/html5-test-page.txt', {encoding: 'utf8'});
			var doc = HtmlParser.parse(text);
			expect(doc).toBeTruthy();
			var counts = countNodes(doc);
			expect(counts.elements).toBe(581);
			expect(counts.texts).toBe(831);
			expect(counts.comments).toBe(2);
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("shouldn't escape ampersands in attributes", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html v="&lt;tag>"></html>');
			var root = doc.getFirstElementChild();
			expect(root?.getAttribute('v')).toBe('&lt;tag>');
			expect(doc.toString()).toBe('<html v="&lt;tag&gt;"></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should accept '<' in attributes", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html v="<tag>"></html>');
			var root = doc.getFirstElementChild();
			expect(root?.getAttribute('v')).toBe('<tag>');
			expect(doc.toString()).toBe('<html v="&lt;tag&gt;"></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should provide attribute names", () => {
		var msg = '';
		try {
			var doc = HtmlParser.parse('<html c="3" a="1" b="2"/>');
			var root = doc.getFirstElementChild();
			var keys1 = root?.getAttributeNames();
			expect(keys1?.length).toBe(3);
			var keys2 = root?.getAttributeNames(true).join();
			expect(keys1?.length).toBe(3);
			expect(keys2).toBe(['a', 'b', 'c'].join());
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should handle both the `class` attribute and the `classList` object", () => {
		var doc = HtmlParser.parse('<html class="aaa bbb"></html>');
		var root = doc.firstElementChild;
		root.classList.add('ccc');
		expect(doc.toString()).toBe('<html class="aaa bbb ccc"></html>');
	});

	it("should handle both the `style` attribute and `style` object", () => {
		var doc = HtmlParser.parse('<html style="display:block"></html>');
		expect(doc.toString()).toBe('<html style="display:block;"></html>');
		var root = doc.firstElementChild;
		root.style.setProperty('color', 'red');
		expect(doc.toString()).toBe('<html style="display:block;color:red;"></html>');
	});

	//TODO test innertHTML getter & setter
	//TODO test innerText setter
	//TODO test comments
});
