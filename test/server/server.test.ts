import { request } from 'http';
import { DOM_CLONEINDEX_ATTR, DOM_ID_ATTR } from "../../src/compiler/app";
import HtmlParser from "../../src/compiler/htmlparser";
import { normalizeText } from "../../src/compiler/util";
import AremelServer from "../../src/server/server";
import { DomElement, ELEMENT_NODE } from "../../src/shared/dom";

const port = 8080;
let server: AremelServer;

describe("test client", () => {
	jest.setTimeout(10000);

	beforeAll((done) => {
		server = new AremelServer(port, process.cwd() + '/test/server/pages', done);
	});

	afterAll((done) => server.close(done));

	it("should serve data.json", (done) => {
		doGet('http://localhost:8080/data.json', (s) => {
			expect(s).toBe(`{"msg": "Hello", "list":[1, 2, 3]}`);
			done();
		});
	});

	it("should serve page1.html", (done) => {
		doGet(`http://localhost:${port}/page1.html`, (s) => {
			expect(cleanup(s)).toBe(normalizeText(`<html>
				<head>
				</head>
				<body>
					Hi there.
				</body>
			</html>`));
			done();
		});
	});

	it("should serve page2.html", (done) => {
		doGet(`http://localhost:${port}/page2.html`, (s) => {
			expect(cleanup(s)).toBe(normalizeText(`<html>
				<head>
				</head>
				<body>
					Hi there.
				</body>
			</html>`));
			done();
		});
	});

	it("should serve page3.html", (done) => {
		doGet(`http://localhost:${port}/page3.html`, (s) => {
			expect(cleanup(s)).toBe(normalizeText(`<html>
				<head>
				</head>
				<body>
					<ul>
						<li>item 1</li><li>item 2</li><li>item 3</li>
					</ul>
				</body>
			</html>`));
			done();
		});
	});

	// it("should serve page4.html", (done) => {
	// 	doGet(`http://localhost:${port}/page4.html`, (s) => {
	// 		expect(cleanup(s)).toBe(normalizeText(`<html>
	// 			<head>
	// 			</head>
	// 			<body>
	// 				<ul>
	// 					<li>item 1</li><li>item 2</li><li>item 3</li>
	// 				</ul>
	// 			</body>
	// 		</html>`));
	// 		done();
	// 	});
	// });

});

// https://nodejs.dev/learn/making-http-requests-with-nodejs
// https://stackoverflow.com/a/9577651
function doGet(url:string, res:(s:string)=>void) {
	var output = '';
	const req = request(url, r => {
		r.setEncoding('utf8');
		r.on('data', (chunk) => output += chunk);
		r.on('end', () => res(output));
	});
	req.on('error', e => res(`ERROR ${e}`));
	req.end();
}

function cleanup(s:string): string {
	var doc = HtmlParser.parse(s);
	function f(e:DomElement) {
		e.removeAttribute(DOM_ID_ATTR);
		e.removeAttribute(DOM_CLONEINDEX_ATTR);
		e.childNodes.forEach((n, i) => {
			if (n.nodeType === ELEMENT_NODE) {
				if (e.tagName === 'BODY' && (n as DomElement).tagName === 'SCRIPT') {
					e.removeChild(n);
				} else if (e.tagName === 'HEAD' && (n as DomElement).tagName === 'STYLE') {
					if ((n as DomElement).getAttribute('data-name') === 'aremel') {
						e.removeChild(n);
					}
				} else {
					f(n as DomElement);
				}
			}
		});
	}
	if (doc.firstElementChild) {
		f(doc.firstElementChild);
		return normalizeText(doc.toString(true));
	} else {
		return `ERROR: ${s}`;
	}
}
