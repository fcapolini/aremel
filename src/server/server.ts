import express from 'express';
import fs from "fs";
import { request, Server } from 'http';
import path from "path";
import AremelClient from '../client/client';
import App from '../compiler/app';
import { HtmlDocument, HtmlElement, HtmlText } from '../compiler/htmldom';
import HtmlParser from '../compiler/htmlparser';
import Preprocessor from '../compiler/preprocessor';
import { DomDocument, ELEMENT_NODE, TEXT_NODE } from '../shared/dom';
import { CSS_AUTOHIDE_CLASS, make, PageObj, RequestObj } from '../shared/runtime';
import { normalizeText } from '../shared/util';

const CODE_PREFIX = 'window.__aremel = ';
const CODE_PREFIX_LEN = CODE_PREFIX.length;

export default class AremelServer {
	server: Server;

	constructor(port:number, rootpath:string, cb?:()=>void) {
		const app = express();
		const pageCache = new Map<string, CachedPage>();

		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));

		// https://www.digitalocean.com/community/tutorials/use-expressjs-to-get-url-and-post-parameters
		app.post('/playground-compiler', (req, res) => {
			console.log('playground-compiler 1: ' + req.body.source);//tempdebug
			const prepro = new Preprocessor(rootpath, [{
				fname: 'index.html',
				content: req.body.source
			}])
			var base = `http://${req.headers.host}`;
			var url = new URL('index.html', base);
			AremelServer.getPage(prepro, url, (doc) => {
				console.log('playground-compiler 1: ' + doc.toString());//tempdebug
				res.header("Content-Type",'text/html');
				res.send(doc.toString());
			}, (err) => {
				res.header("Content-Type",'text/plain');
				res.send(`${err}`.split('<').join('&lt;').split('>').join('&gt;'));
			});
		});

		app.get("*", (req, res, next) => {
			if (/^[^\.]+$/.test(req.url)) {
				var base = `http://${req.headers.host}`;
				var url = new URL(req.url, base);
				var pathname = path.join(rootpath, url.pathname);
				if (fs.statSync(pathname)?.isDirectory()) {
					req.url = path.join(req.url, 'index.html');
				}
			}
			next('route');
		});
		
		app.get('*.html', (req, res) => {
			var prepro = new Preprocessor(rootpath);
			var base = `http://${req.headers.host}`;
			var url = new URL(req.url, base);
			AremelServer._getPageWithCache(prepro, url, cb ? null : pageCache,
			(html) => {
				res.header("Content-Type",'text/html');
				res.send(html);
			}, (err) => {
				res.header("Content-Type",'text/plain');
				res.send(`${err}`.split('<').join('&lt;').split('>').join('&gt;'));
				console.log(`[server]: error for ${url.toString()}: ${err}`);
			});
		});

		app.use(express.static(rootpath));

		this.server = app.listen(port, () => {
			if (cb) {
				cb();
			} else {
				console.log(`[server]: http://localhost:${port} [${rootpath}]`);
			}
		});
	}

	close(cb?:()=>void) {
		try {
			this.server.close(cb);
		} catch (ex:any) {
			cb ? cb() : null;
		}
	}

	//TODO: prevent concurrency problems
	static _getPageWithCache(prepro:Preprocessor,
							url:URL,
							cache:Map<string,CachedPage>|null,
							cb:(doc:string)=>void,
							err:(err:any)=>void) {
		var that = this;
		var filePath = path.normalize(path.join(prepro.rootPath, url.pathname) + '_');
		var cachedPage;
		
		//TODO unify with app.ts requester function
		var base = `http://${url.hostname}:${url.port}`;
		function requester(req:RequestObj, cb:(s:string)=>void) {
			//TODO: req.post
			var output = '';
			var url = new URL(req.url, base);
			const r = request(url, r => {
				r.setEncoding('utf8');
				r.on('data', (chunk) => output += chunk);
				r.on('end', () => cb(output));
			});
			r.on('error', e => cb(`{"httpError":"${e}"}`));
			r.end();
		}
		
		function f(useCache:boolean) {
			if (useCache) {
				fs.readFile(filePath, 'utf8', (error, data) => {
					if (error) {
						err(error);
					} else {
						var doc = HtmlParser.parse(data);
						var body = Preprocessor.lookupTags(doc.firstElementChild, new Set(['BODY']))[0] as HtmlElement;
						// last two scripts are always: page code, runtime loading
						var scripts = Preprocessor.lookupTags(body, new Set(['SCRIPT']));
						scripts.pop();
						var window = {
							addEventListener: (t:string, h:any) => {},
							removeEventListener: (t:string, h:any) => {},
						};
						var script = scripts.pop() as HtmlElement;
						var code = (script.firstChild as HtmlText).nodeValue;
						code = code.substring(CODE_PREFIX_LEN);
						var page:PageObj = {
							doc: doc as DomDocument,
							nodes: AremelClient.collectNodes(doc as DomDocument),
							window: window,
							requester: requester,
							script: code
						};
						var rt = make(page, () => cb(doc.toString()));
						eval(`(${page.script})(rt)`);
						rt.start();
					}
				});
			} else {
				that.getPage(prepro, url, (doc) => {
					that._normalizeSpace(doc);
					var html = doc.toString();
					cb(html);
					if (cache) {
						fs.writeFile(filePath, html, {encoding:'utf8'}, (error) => {
							if (error) {
								console.log(error);//TODO
							} else {
								var tstamp = new Date().valueOf();
								cachedPage = new CachedPage(tstamp, prepro);
								cache.set(filePath, cachedPage);
							}
						});
					}
				}, err);
			}
		}

		cachedPage = cache?.get(filePath);
		if (cachedPage) {
			cachedPage.isUpToDate(f);
		} else {
			f(false);
		}
	}

	static getPage(prepro:Preprocessor,
					url:URL,
					cb:(doc:HtmlDocument)=>void,
					err:(err:any)=>void) {
		try {
			var doc = prepro.read(url.pathname, `<lib>
				<style data-name="aremel">
					.${CSS_AUTOHIDE_CLASS} {
						display: none;
					}
				</style>
				<:define tag=":data-source:script"
					:url=""
					:autoGet=[[true]]
					:type="text/json"
					:post=[[false]]
					:params=[[null]]

					type=[[type]]
					:on-url=[[
						if (autoGet) {
							__rt.addRequest({
								url:url, type:type,
								post:post, params:undefined,
								target:__this.__value_content,
								scriptElement:__this.__dom
							});
						}
					]]
					:doRequest=[[(params) => {
						__rt.addRequest({
							url:url, type:type,
							post:post, params:params,
							target:__this.__value_content,
							scriptElement:__this.__dom
						});
					}]]
					:content=[[undefined]]
				/>
			</lib>`) as HtmlDocument;
			var app = new App(url, doc);
			var page = app.output();
			var rt = make(page, () => cb(doc));
			var root = eval(`(${page.script})(rt)`);
			rt.start();
			var code = new HtmlElement(doc, root.body.__dom, 'script', 0, 0, 0);
			new HtmlText(doc, code, CODE_PREFIX + page.script, 0, 0, 0, false);
			var script = new HtmlElement(doc, root.body.__dom, 'script', 0, 0, 0);
			script.setAttribute('src', '/.aremel/bin/aremel.js');
			script.setAttribute('defer', '');
		} catch (ex:any) {
			// console.trace(ex);
			err(ex);
		}
	}

	static _normalizeSpace(doc:HtmlDocument) {
		function f(e:HtmlElement) {
			for (var n of e.children) {
				if (n.nodeType === TEXT_NODE) {
					(n as HtmlText).nodeValue = normalizeText((n as HtmlText).nodeValue);
				} else if (n.nodeType === ELEMENT_NODE) {
					if ((n as HtmlElement).tagName === 'SCRIPT'
							|| (n as HtmlElement).tagName === 'PRE') {
						continue;
					}
					f(n as HtmlElement);
				}
			}
		}
		f(doc.firstElementChild);
	}

}

class CachedPage {
	tstamp: number;
	sources: string[];

	constructor(tstamp:number, prepro:Preprocessor) {
		this.tstamp = tstamp;
		this.sources = prepro.parser.origins.slice();
		while (this.sources.length > 0) {
			if (this.sources[this.sources.length - 1] === 'embedded') {
				this.sources.pop();
			} else {
				break;
			}
		}
	}

	//TODO: no two actual checks within the same second
	isUpToDate(cb:(ok:boolean)=>void) {
		var that = this;
		var i = this.sources.length - 1;
		function f(i:number) {
			fs.stat(that.sources[i], (err, stats) => {
				if (err) {
					cb(false);
				} else if (stats.mtime.valueOf() > that.tstamp) {
					cb(false);
				} else if (i < 1) {
					cb(true);
				} else {
					f(--i);
				}
			})
		}
		f(this.sources.length - 1);
	}
}
