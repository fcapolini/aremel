import { DOM_ID_ATTR } from "../compiler/app";
import { DomDocument, DomElement, DomTextNode, ELEMENT_NODE } from "../shared/dom";
import { make, PageObj, RuntimeEventSource, RuntimeObj } from "../shared/runtime";

export default class AremelClient {
	pageObj: PageObj;
	runtime: RuntimeObj;
	root: any;

	constructor(doc:DomDocument, window:any, getAndCleanScript=false) {
		this.pageObj = {
			doc: doc,
			nodes: this.collectNodes(doc),
			window: window,
			requester: AremelClient.httpRequest,
			script: getAndCleanScript ? this.getScript(doc) : undefined,
		};
		this.runtime = make(this.pageObj);
		if (getAndCleanScript) {
			eval(this.pageObj.script as string);
		}
		this.root = window.__aremel(this.runtime);
		this.runtime.start();
		window.aremel = this.root;
	}

	collectNodes(doc:DomDocument): Array<DomElement> {
		var ret = new Array<DomElement>();
		function f(e:DomElement) {
			var id = e.getAttribute(DOM_ID_ATTR);
			if (id != null) {
				ret[parseInt(id)] = e;
			}
			e.childNodes.forEach((n, i) => {
				if (n.nodeType === ELEMENT_NODE) {
					f(n as DomElement);
				}
			});
		}
		f(doc.firstElementChild as DomElement);
		return ret;
	}

	getScript(doc:DomDocument): string|undefined {
		var html:DomElement|undefined = doc.firstElementChild;
		var code:string|undefined = undefined;
		var bodyScripts = new Array<DomElement>();
		html?.childNodes.forEach((n, i) => {
			if (n.nodeType === ELEMENT_NODE) {
				if ((n as DomElement).tagName === 'BODY') {
					(n as DomElement).childNodes.forEach((n, i) => {
						if ((n as DomElement).tagName === 'SCRIPT') {
							bodyScripts.push(n as unknown as DomElement);
							if (!(n as DomElement).getAttribute('src')) {
								code = ((n as DomElement).firstChild as DomTextNode).nodeValue;
							}
						}
					});
				}
			}
		});
		for (var e of bodyScripts) {
			e.parentElement?.removeChild(e);
		}
		return code;
	}

	static httpRequest(url:string, post:boolean, cb:(s:string)=>void) {
		console.log(`httpRequest(${url})`);//tempdebug
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					cb(this.responseText);
				} else {
					cb(`{"httpError":"${this.status}"}`);
				}
			}
		}
		xhttp.open(post ? 'POST' : 'GET', url, true);
		xhttp.send();
	}

}
