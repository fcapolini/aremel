import { ELEMENT_NODE, HtmlDocument, HtmlElement, TEXT_NODE } from "../../src/compiler/htmldom";
import Preprocessor, { domGetTop, PreprocessorError } from "../../src/compiler/preprocessor";
import { EReg } from "../../src/compiler/util";

let preprocessor:Preprocessor;

describe("test preprocessor", () => {

	beforeAll(() => {
		var rootPath = process.cwd() + '/test/compiler/preprocessor';
		preprocessor = new Preprocessor(rootPath);
	});

	it("should complain about missing file", () => {
		var msg = '';
		try {
			preprocessor.read('inexistent.html');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('Could not read file "inexistent.html"');
	});

	it("should read the single test001.html UFT-8 file", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test001.html');
			expect(doc).toBeDefined();
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString()).toBe('<html utf8-value="€"></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	// =========================================================================
	// inclusion
	// =========================================================================

	it("should follow test002.html inclusion chain", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test002.html');
			expect(doc).toBeDefined();
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString()).toBe('<html><div>Test 2</div></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should include test002includes.html inclusions twice", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test002includes.html');
			expect(doc).toBeDefined();
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString())
				.toBe('<html><div>Test 2</div><div>Test 2</div></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should import test002imports.html inclusions once", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test002imports.html');
			expect(doc).toBeDefined();
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString())
				.toBe('<html><div>Test 2</div></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should forbid access to files outside root path", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test003.html');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('Forbidden file path "../dummy.htm"');
	});

	it("should complain of missing src in includes", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test004.html');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('test004.html:1 col 8: Missing "src" attribute');
	});

	it("should remove adjacent text nodes", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test005.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should pass include root attributes to target element", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('testIncludedRootAttributesShouldPassToTargetElement.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			var head = doc ? domGetTop(doc, 'HEAD') : undefined;
			expect(head?.getAttribute(':overriddenAttribute')).toBe('1');
			expect(head?.getAttribute(':attribute1')).toBe('hi');
			expect(head?.getAttribute(':attribute2')).toBe('there');
			expect(head?.getAttribute(':attribute3')).toBe('2');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should accept textual includes", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('testTextualInclude.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString())
				.toBe('<html><body>This is a "text"</body></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	// =========================================================================
	// macros
	// =========================================================================

	it("should expand an empty macro", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test101.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString()).toBe('<html><div></div></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should expand a macro with text", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test102.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString()).toBe('<html><span>[[text]]</span></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should follow macro inheritance", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test103.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString())
				.toBe('<html><span><b>[[text]]</b></span></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should add attributes and content to expanded macros", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test104.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(doc?.toString())
				.toBe('<html><span class="title"><b>[[text]]</b>OK</span></html>');
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should keep non-overridden macro attributes", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test201.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(normalizeText(doc?.toString()))
				.toBe(normalizeText('<html>\n'
				+ '	<body>\n'
				+ '		<div class="pippo">localhost</div>\n'
				+ '	</body>\n'
			+ '</html>'));
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should replace overridden macro attributes", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test202.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(normalizeText(doc?.toString()))
				.toBe(normalizeText('<html>\n'
				+ '	<body>\n'
				+ '		<div class="pluto">localhost</div>\n'
				+ '	</body>\n'
			+ '</html>'));
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should let macro define their `default` slot", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test203.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(normalizeText(doc?.toString()))
				.toBe(normalizeText('<html>\n'
				+ '	<body>\n'
				+ '		<div class="pippo">\n'
				+ '			title: <b>localhost</b>\n'
				+ '		</div>\n'
				+ '	</body>\n'
			+ '</html>'));
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should users nest macros (1)", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('test204.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(normalizeText(doc?.toString())).toBe(normalizeText(`<html>
				<head>
				</head>
				<body>
					<div class=\"kit-page\">
						<div class=\"kit-nav\"></div>
					</div>
				</body>
			</html>`));
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

	it("should users nest macros (2)", () => {
		var msg = '';
		try {
			var doc = preprocessor.read('testNestedMacros1.html');
			expect(adjacentTextNodes(doc)).toBeFalsy();
			expect(normalizeText(doc?.toString())).toBe(normalizeText(`<html>
				<head>
				</head>
				<body>
					<div class=\"kit-page\">
						<div class=\"kit-nav\"><div>[[pageScrollY]] ([[pageScrollDeltaY]])</div></div>
					</div>
				</body>
			</html>`));
		} catch (ex:any) {
			msg = `${ex}`;
		}
		expect(msg).toBe('');
	});

});

// =============================================================================
// util
// =============================================================================

function adjacentTextNodes(doc?:HtmlDocument): boolean {
	var ret = false;
	function f(e:HtmlElement) {
		var prevType = -1;
		for (var n of e.children) {
			if (n.nodeType === TEXT_NODE && n.nodeType === prevType) {
				ret = true;
			}
			if (n.nodeType == ELEMENT_NODE) {
				f(n as HtmlElement);
			}
			if (ret) {
				break;
			}
			prevType = n.nodeType;
		}
	}
	var root = doc?.getFirstElementChild();
	root ? f(root) : null;
	return ret;
}

function normalizeText(s?:string): string {
	if (s) {
		// @ts-ignore
		return new EReg('([\\s]+)', 'gm').map(s, (ereg) => {
			return ereg.matched(1).indexOf('\n') >= 0 ? '\n' : ' ';
		});
	}
	// @ts-ignore
	return undefined;
}
