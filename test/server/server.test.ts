import { request } from 'http';
import { DOM_CLONEINDEX_ATTR, DOM_ID_ATTR } from "../../src/compiler/app";
import HtmlParser from "../../src/compiler/htmlparser";
import { normalizeText } from "../../src/compiler/util";
import AremelServer from "../../src/server/server";
import { DomElement, ELEMENT_NODE } from "../../src/shared/dom";

let server: AremelServer;

describe("test client", () => {
	jest.setTimeout(10000);

	beforeAll((done) => {
		server = new AremelServer(8080, process.cwd() + '/test/server/pages', done);
	});

	afterAll((done) => {
		server.close(done);
	});

	it("should serve page1.html", (done) => {
		setTimeout(() => {
			doGet('http://localhost:8080/page1.html', (s) => {
				server.close();
				expect(cleanup(s)).toBe(normalizeText(`<html>
					<head>
					</head>
					<body>
						Hi there
					</body>
				</html>`));
				done();
			}, (e) => {
				expect(e).toBeUndefined();
				done();
			});
		}, 2000);
	});

});

// https://nodejs.dev/learn/making-http-requests-with-nodejs
// https://stackoverflow.com/a/9577651
function doGet(url:string, res:(s:string)=>void, err?:(e:string)=>void) {
	var output = '';
	const req = request(url, r => {
		r.setEncoding('utf8');
		r.on('data', (chunk) => output += chunk);
		r.on('end', () => res(output));
	});
	err ? req.on('error', err) : null;
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
	f(doc.firstElementChild);
	return normalizeText(doc.toString(true));
}
