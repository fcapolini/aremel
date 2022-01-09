import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import fs from "fs";
import { request, Server } from 'http';
import path from "path";
import AremelClient from '../client/client';
import App from '../compiler/app';
import { HtmlDocument, HtmlElement, HtmlText } from '../compiler/htmldom';
import HtmlParser from '../compiler/htmlparser';
import Preprocessor, { lookupTags } from '../compiler/preprocessor';
import { DomDocument, ELEMENT_NODE, TEXT_NODE } from '../shared/dom';
import { CSS_AUTOHIDE_CLASS, make, PageObj, RequestObj } from '../shared/runtime';
import { normalizeText } from '../shared/util';
import safeEval from './safe-eval';

const CODE_PREFIX = 'window.__aremel = ';
const CODE_PREFIX_LEN = CODE_PREFIX.length;

export interface TrafficLimit {
	windowMs: number,
	maxRequests: number,
}

export interface ServerProps {
	port: number,
	rootPath: string,
	useCache?: boolean,
	assumeHttps?: boolean,
	trustProxy?: boolean,
	domainsWhitelist?: Set<string>,
	pageLimit?: TrafficLimit,
}

export default class AremelServer {
	server: Server;

	constructor(props:ServerProps,
				init?:(props:ServerProps, app:Application)=>void,
				cb?:()=>void) {
		const that = this;
		const app = express();
		const pageCache = new Map<string, CachedPage>();
		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));

		if (props.trustProxy) {
			// see https://expressjs.com/en/guide/behind-proxies.html
			app.set('trust proxy', 1);
		}

		if (props.domainsWhitelist) {
			app.get('*', function (req, res, next) {
				if (props.domainsWhitelist?.has(req.hostname)) {
					next('route');
				} else {
					req.socket.end();
				} 
			});
		}

		if (init) {
			// initialize app-specific web services
			init(props, app);
		}

		// limit page requests rate
		if (props.pageLimit) {
			AremelServer.setLimiter(props.pageLimit, ['*', '*.html'], app);
		}

		// externally redirect requests for directories to <dir>/index
		// internally redirect requests to files w/o suffix to <file>.html
		app.get("*", (req, res, next) => {
			console.log(`${this._getTimestamp()}: GET ${req.url}`);
			if (/^[^\.]+$/.test(req.url)) {
				var base = `http://${req.headers.host}`;
				var url = new URL(req.url, base);
				var pathname = path.join(props.rootPath, url.pathname);
				if (fs.existsSync(pathname) && fs.statSync(pathname)?.isDirectory()) {
					if (url.pathname.endsWith('/')) {
						req.url = path.join(req.url, 'index.html');
						next('route');
					} else {
						res.redirect(req.url + '/index');
					}
				} else {
					req.url = req.url + '.html';
					next('route');
				}
			} else {
				next('route');
			}
		});
		
		// serve pages
		app.get('*.html', (req, res) => {
			var prepro = new Preprocessor(props.rootPath);
			var base = `http://${req.headers.host}`;
			var url = new URL(req.url, base);
			url.protocol = (props.assumeHttps ? 'https' : req.protocol);
			url.hostname = req.hostname;
			that._getPageWithCache(prepro, url, props.useCache ? pageCache : null,
			(html) => {
				res.header("Content-Type",'text/html');
				res.send(html);
			}, (err) => {
				res.header("Content-Type",'text/plain');
				res.send(`${err}`);
				console.log(`${this._getTimestamp()}: `
					+ `ERROR ${url.toString()}: ${err}`);
			});
		});

		// serve static content
		app.use(express.static(props.rootPath));

		this.server = app.listen(props.port, () => {
			if (cb) {
				cb();
			} else {
				console.log(`${this._getTimestamp()}: START `
					+ `http://localhost:${props.port} [${props.rootPath}]`);
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

	_getTimestamp(): string {
		const d = new Date();
		return d.getFullYear() + '-'
				+ ('' + (d.getMonth() + 1)).padStart(2, '0') + '-'
				+ ('' + d.getDate()).padStart(2, '0') + ' '
				+ ('' + d.getHours()).padStart(2, '0') + ':'
				+ ('' + d.getMinutes()).padStart(2, '0') + ':'
				+ ('' + d.getSeconds()).padStart(2, '0');
	}

	static setLimiter(props:TrafficLimit, paths:Array<string>, app:Application) {
		const limiter = rateLimit({
			windowMs: props.windowMs,
			max: props.maxRequests,
			standardHeaders: true,
			legacyHeaders: false,
		});
		for (var path of paths) {
			app.use(path, limiter);
		}
	}

	//TODO: prevent concurrency problems
	_getPageWithCache(prepro:Preprocessor,
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
				r.on('end', () => {
					cb(output);
				});
			});
			r.on('error', e => {
				cb(`{"httpError":"${e}"}`);
			});
			r.end();
		}
		
		function f(useCache:boolean) {
			const t1 = new Date().getTime();
			if (useCache) {
				fs.readFile(filePath, 'utf8', (error, data) => {
					if (error) {
						err(error);
					} else {
						var doc = HtmlParser.parse(data);
						var body = lookupTags(doc.firstElementChild, new Set(['BODY']))[0] as HtmlElement;
						// last two scripts are always: page code, runtime loading
						var scripts = lookupTags(body, new Set(['SCRIPT']));
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
							isClient: false,
							requester: requester,
							script: code
						};
						var rt = make(page, () => {
							cb(doc.toString());
							const t2 = new Date().getTime();
							setTimeout(() => {
								console.log(`${that._getTimestamp()}: `
									+ `OLDPAGE ${url.toString()} `
									+ `[${t2 - t1}]`);
							}, 0);
						});
						eval(`(${page.script})(rt)`);
						rt.start();
					}
				});
			} else {
				AremelServer.getPage(prepro, url, (doc) => {
					AremelServer._normalizeSpace(doc);
					var html = doc.toString();
					cb(html);
					const t2 = new Date().getTime();
					setTimeout(() => {
						console.log(`${that._getTimestamp()}: `
							+ `NEWPAGE ${url.toString()} `
							+ `[${t2 - t1}]`);
					}, 0);
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
			var root = safeEval(`(${page.script})(rt)`, {rt:rt});
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

	// static _logDocNodeCounts(label:string, doc:DomDocument) {
	// 	const n = this._countDocNodes(doc);
	// 	console.log(`${label}: ${n.ee}, ${n.tt}, ${n.cc}, ${n.oo}`);
	// }

	// static _countDocNodes(doc:DomDocument): {ee:number, tt:number, cc:number, oo:number} {
	// 	const ret = {ee:0, tt:0, cc:0, oo:0};
	// 	function f(e:DomElement) {
	// 		e.childNodes.forEach((n, i) => {
	// 			switch (n.nodeType) {
	// 				case ELEMENT_NODE: ret.ee++; f(n as DomElement); break;
	// 				case TEXT_NODE: ret.tt++; break;
	// 				case COMMENT_NODE: ret.ee++; break;
	// 				default: ret.oo++;
	// 			}
	// 		});
	// 	}
	// 	f(doc.firstElementChild as DomElement);
	// 	return ret;
	// }

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
