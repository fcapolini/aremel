import { request } from 'http';
import { DOM_CLONEINDEX_ATTR, DOM_ID_ATTR } from "../../src/shared/runtime";
import HtmlParser from "../../src/compiler/htmlparser";
import { normalizeText } from "../../src/shared/util";
import AremelServer from "../../src/server/server";
import { DomElement, ELEMENT_NODE } from "../../src/shared/dom";

const port = 8081;
let server: AremelServer;

describe("test server", () => {
	jest.setTimeout(30000);

	beforeAll((done) => {
		server = new AremelServer({
			port: port,
			rootPath: process.cwd() + '/test/server/pages',
			mute: true,
		}, undefined, done);
	});

	afterAll((done) => server.close(done));

	it("should serve data.json", (done) => {
		doGet(`http://localhost:${port}/data.json`, (s) => {
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

	// embedded data
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

	// dynamic local data w/ absolute address
	it("should serve page4.html", (done) => {
		doGet(`http://localhost:${port}/page4.html`, (s) => {
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

	// dynamic local data w/ partial address
	it("should serve page5.html", (done) => {
		doGet(`http://localhost:${port}/page5.html`, (s) => {
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

	it("should accept double quotes in square attributes (1)", (done) => {
		doGet(`http://localhost:${port}/doubleQuotesInSquareAttributes1.html`, (s) => {
			expect(cleanup(s)).toBe(normalizeText(
				`<html lang="en"><head>
				</head><body></body></html>`));
			done();
		});
	});

	it("should accept double quotes in square attributes (2)", (done) => {
		doGet(`http://localhost:${port}/doubleQuotesInSquareAttributes2.html`, (s) => {
			try {
				s = cleanup(s);
				// console.log(s);//tempdebug
				expect(s).toBe(normalizeText(
				`<html>
					<head>
					</head>
					<body>
						<div>
							<ul class="list-group">
								<a class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" href="#">
									<label style="width:100%;">
										<input class="form-check-input me-1" type="checkbox" value="" />
									</label>
									<span class="badge bg-primary rounded-pill __aremel-autohide">&zwnj;</span>
								</a>
							</ul>
							<!--<script src="/.kit/bootstrap/res/bootstrap.bundle.min.js"></script>-->
						</div>
					</body>
				</html>`));
				done();
			} catch (error) {
				done(error);
			}
		});
	});

	it("should perform replication (1)", (done) => {
		doGet(`http://localhost:${port}/replication1.html`, (s) => {
			try {
				s = cleanup(s);
				// console.log(s);//tempdebug
				expect(s).toBe(normalizeText(
				`<!DOCTYPE html>
				<html>
				<head>
				</head><body>
				<ul>
				<li>
				1
				</li><li>
				2
				</li><li>
				3
				</li>
				</ul>
				</body>
				</html>`));
				done();
			} catch (error) {
				done(error);
			}
		});
	});

	it("should perform replication (2)", (done) => {
		doGet(`http://localhost:${port}/replication2.html`, (s) => {
			try {
				s = cleanup(s);
				// console.log(s);//tempdebug
				expect(s).toBe(normalizeText(
				`<!DOCTYPE html>
				<html>
				<head>
				</head><body>
				<ul>
				<li>
				Item 1
				</li><li>
				Item 2
				</li><li>
				Item 3
				</li>
				</ul>
				</body>
				</html>`));
				done();
			} catch (error) {
				done(error);
			}
		});
	});
});

// https://nodejs.dev/learn/making-http-requests-with-nodejs
// https://stackoverflow.com/a/9577651
function doGet(url:string, res:(s:string)=>void) {
	var output = '';
	function f(s:string) {
		res(s);
	}
	const req = request(url, r => {
		r.setEncoding('utf8');
		r.on('data', (chunk) => output += chunk);
		r.on('end', () => f(output));
	});
	req.on('error', e => f(`ERROR ${e}`));
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
