import e from 'express';
import express from 'express';
import { Server } from 'http';
import App from '../compiler/app';
import { HtmlDocument, HtmlElement, HtmlText } from '../compiler/htmldom';
import Preprocessor from '../compiler/preprocessor';
import { CSS_AUTOHIDE_CLASS, make } from '../shared/runtime';

export default class AremelServer {
	server: Server;

	constructor(port:number, rootpath:string, cb?:()=>void) {
		const prepro = new Preprocessor(rootpath);
		const app = express();
		app.get('*.html', (req, res) => {
			res.header("Content-Type",'text/html');
			var base = `http://${req.headers.host}`;
			var url = new URL(req.url, base);
			try {
				AremelServer.getPage(prepro, url, (doc) => {
					res.send(doc.toString());
				});
			} catch (ex:any) {
				console.log(`[server]: error for ${url.toString()}: ${ex}`);
				res.send(`${ex}`);
			}
		});
		app.get('/', (req, res) => res.redirect('/index.html'));
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

	static getPage(prepro:Preprocessor, url:URL, cb:(doc:HtmlDocument)=>void) {
		var doc = prepro.read(url.pathname, `<lib>
			<style data-name="aremel">
				.${CSS_AUTOHIDE_CLASS} {
					display: none;
				}
			</style>
			<:define tag=":data-source:script"
				:url=""
				:type="text/json"
				:post=[[false]]

				type=[[type]]
				:on-url="[[
					__rt.addRequest({
						url:url, type:type, target:__this.__value_content,
						post:post, scriptElement:__this.__dom
					})
				]]"
				:content=[[undefined]]
			/>
		</lib>`) as HtmlDocument;
		var app = new App(url, doc);
		var page = app.output();
		var rt = make(page, () => cb(doc));
		var root = eval(`(${page.script})(rt)`);
		rt.start();
		var code = new HtmlElement(doc, root.body.__dom, 'script', 0, 0, 0);
		new HtmlText(doc, code, `window.__aremel = ${page.script}`, 0, 0, 0, false);
		var script = new HtmlElement(doc, root.body.__dom, 'script', 0, 0, 0);
		script.setAttribute('src', '/.aremel/bin/aremel.js');
		script.setAttribute('defer', '');
	}

}
