import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import fs from "fs";
import { Server } from 'http';
import path from "path";
import AremelClient from '../client/client';
import App from '../compiler/app';
import Compiler from '../compiler/compiler';
import { HtmlElement, HtmlText } from '../compiler/htmldom';
import HtmlParser from '../compiler/htmlparser';
import { lookupTags } from '../compiler/preprocessor';
import { DomDocument } from '../shared/dom';
import { make, PageObj } from '../shared/runtime';
import exitHook from './exit-hook';
import safeEval from './safe-eval';

export const CODE_PREFIX = 'window.__aremel = ';
export const CODE_PREFIX_LEN = CODE_PREFIX.length;

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
	logger?: (type:string, msg:string)=>void,
	mute?: boolean,
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
			AremelServer.log(props, 'info', `${this._getTimestamp()}: GET ${req.url}`);
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
			var base = `http://${req.headers.host}`;
			var url = new URL(req.url, base);
			url.protocol = (props.assumeHttps ? 'https' : req.protocol);
			url.hostname = req.hostname;
			that._getPageWithCache(props, url, props.useCache ? pageCache : null,
			(html) => {
				res.header("Content-Type",'text/html');
				res.send(html);
			}, (err) => {
				res.header("Content-Type",'text/plain');
				res.send(`${err}`);
				AremelServer.log(props, 'error', `${this._getTimestamp()}: `
					+ `ERROR ${url.toString()}: ${err}`);
			});
		});

		// serve static content
		app.use(express.static(props.rootPath));

		this.server = app.listen(props.port, () => {
			if (cb) {
				cb();
			} else {
				AremelServer.log(props, 'info',`${this._getTimestamp()}: START `
					+ `http://localhost:${props.port} [${props.rootPath}]`);
			}
		});

		exitHook(() => {
			console.log('WILL EXIT');
		});
	}

	close(cb?:()=>void) {
		try {
			this.server.close(cb);
		} catch (ex:any) {
			cb ? cb() : null;
		}
	}

	static log(props:ServerProps, type:string, msg:string) {
		if (!props.mute) {
			if (props.logger) {
				props.logger(type, msg);
			} else {
				switch (type) {
					case 'error': console.error(msg); break;
					case 'info': console.info(msg); break;
					case 'warn': console.warn(msg); break;
					default: console.log(msg);
				}
			}
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
	_getPageWithCache(props:ServerProps,
					url:URL,
					cache:Map<string,CachedPage>|null,
					cb:(doc:string)=>void,
					err:(err:any)=>void) {
		var that = this;
		var filePath = path.normalize(path.join(props.rootPath, url.pathname) + '_');
		var cachedPage;
		
		function f(useCache:boolean) {
			const t1 = new Date().getTime();
			if (useCache) {
				fs.readFile(filePath, 'utf8', (error, data) => {
					if (error) {
						err(error);
					} else {
						var doc = HtmlParser.parse(data);
						var body = lookupTags(
							doc.firstElementChild,
							new Set(['BODY'])
						)[0] as HtmlElement;
						// last two scripts are always: page code, runtime loading
						var scripts = lookupTags(body, new Set(['SCRIPT']));
						scripts.pop();
						var window = {
							addEventListener: (t:string, h:any) => {},
							removeEventListener: (t:string, h:any) => {},
							location: {toString: () => url.toString()},
						};
						var script = scripts.pop() as HtmlElement;
						var code = (script.firstChild as HtmlText).nodeValue;
						code = code.substring(CODE_PREFIX_LEN);
						var page:PageObj = {
							url: url,
							doc: doc as DomDocument,
							nodes: AremelClient.collectNodes(doc as DomDocument),
							window: window,
							isClient: false,
							requester: App.requester,
							script: code
						};
						var rt = make(page, () => {
							cb(doc.toString());
							const t2 = new Date().getTime();
							setTimeout(() => {
								AremelServer.log(props, 'info', `${that._getTimestamp()}: `
									+ `OLDPAGE ${url.toString()} `
									+ `[${t2 - t1}]`);
							}, 0);
						});
						safeEval(`(${page.script})(rt)`, {rt:rt});
						rt.start();
					}
				});
			} else {
				Compiler.getPage(props.rootPath, url, (html, sources) => {
					cb(html);
					const t2 = new Date().getTime();
					setTimeout(() => {
						AremelServer.log(props, 'info', `${that._getTimestamp()}: `
							+ `NEWPAGE ${url.toString()} `
							+ `[${t2 - t1}]`);
					}, 0);
					if (cache) {
						fs.writeFile(filePath, html, {encoding:'utf8'}, (error) => {
							if (error) {
								AremelServer.log(props, 'error', `${error}`);//TODO
							} else {
								var tstamp = new Date().valueOf();
								cachedPage = new CachedPage(tstamp, sources);
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

}

class CachedPage {
	tstamp: number;
	sources: string[];

	constructor(tstamp:number, sources:Array<string>) {
		this.tstamp = tstamp;
		this.sources = sources;
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
