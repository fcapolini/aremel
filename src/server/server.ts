import express from 'express';
import App, { CSS_AUTOHIDE_CLASS } from '../compiler/app';
import { HtmlDocument, HtmlElement, HtmlText } from '../compiler/htmldom';
import Preprocessor from '../compiler/preprocessor';
import { make } from '../shared/runtime';

export default class AremelServer {

	constructor(port:number, rootpath:string) {
		const prepro = new Preprocessor(rootpath);
		const app = express();
		app.get('*.html', (req, res) => {
			res.header("Content-Type",'text/html');
			var url = new URL(req.url, `http://${req.headers.host}`);
			try {
				var doc = AremelServer.getPage(prepro, url);
				res.send(doc.toString());
			} catch (ex:any) {
				console.log(`[server]: error for ${url.toString()}: ${ex}`);
				res.send(`${ex}`);
			}
		});
		app.get('/', (req, res) => res.redirect('/index.html'));
		app.use(express.static(rootpath));
		app.listen(port, () => {
			console.log(`[server]: http://localhost:${port} [${rootpath}]`);
		});
	}

	static getPage(prepro:Preprocessor, url:URL): HtmlDocument {
		var doc = prepro.read(url.pathname, `<lib>
			<style data-name="aremel">
				${CSS_AUTOHIDE_CLASS} {
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
						url:url, type:type, target:__this.__value_data,
						post:post, scriptElement:__this.__dom
					})
				]]"
				:data=[[undefined]]
			/>
		</lib>`) as HtmlDocument;
		var app = new App(doc);
		var page = app.output();
		var rt = make(page);
		var root = eval(`(${page.script})(rt)`);
		rt.start();
		var code = new HtmlElement(doc, root.body.__dom, 'script', 0, 0, 0);
		new HtmlText(doc, code, `window.__aremel = ${page.script}`, 0, 0, 0, false);
		var script = new HtmlElement(doc, root.body.__dom, 'script', 0, 0, 0);
		script.setAttribute('src', '/.aremel/bin/bundle.js');
		script.setAttribute('defer', '');
		return doc;
	}

}
