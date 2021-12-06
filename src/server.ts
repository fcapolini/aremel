import express from 'express';
import App from './compiler/app';
import { HtmlDocument } from './compiler/htmldom';
import Preprocessor from './compiler/preprocessor';
import { make } from './shared/runtime';

class Aremel {

	constructor(port:number, rootpath:string) {
		const prepro = new Preprocessor(rootpath);
		const app = express();
		app.get('*.html', (req, res) => {
			res.header("Content-Type",'text/html');
			var url = new URL(req.url, `http://${req.headers.host}`);
			try {
				var content = this.getPage(prepro, url);
				res.send(content);
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

	getPage(prepro:Preprocessor, url:URL): string {
		var doc = prepro.read(url.pathname) as HtmlDocument;
		var app = new App(doc);
		var page = app.output();
		var rt = make(page);
		var root = eval(`(${page.script})(rt)`);
		rt.start();
		return doc.toString();
	}

}

new Aremel(8080, process.cwd());
