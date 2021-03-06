import { DomDocument, DomElement, DomTextNode, ELEMENT_NODE } from "../shared/dom";
import { DOM_ID_ATTR, make, PageObj, RequestObj, RuntimeEventSource, RuntimeObj, RuntimeWindow } from "../shared/runtime";
import { eregMap } from "../shared/util";

export default class AremelClient {
	pageObj: PageObj;
	runtime: RuntimeObj;
	root: any;

	constructor(doc:DomDocument, window:RuntimeWindow, getAndCleanScript=false) {
		window.aremelEregMap = eregMap;
		this.pageObj = {
			url: new URL((window as Window).location.toString()),
			doc: doc,
			nodes: AremelClient.collectNodes(doc),
			window: window,
			isClient: true,
			requester: AremelClient.requester,
			script: getAndCleanScript ? this.getScript(doc) : undefined,
		};
		this.runtime = make(this.pageObj);
		var textDecoder = doc.createElement('span');
		this.runtime.textCallback = (n:DomTextNode, v:any) => {
			// client-side, textCallback needs HTML entities decoding
			var s = (v ? '' + v : '&zwnj;').replace(/>/g, '&gt;').replace(/</g, '&lt;');	
			textDecoder.innerHTML = s;
			n.nodeValue = textDecoder.firstChild
				? (textDecoder.firstChild as DomTextNode).nodeValue
				: '';
		}
		if (getAndCleanScript) {
			eval(this.pageObj.script as string);
		}
		this.root = window.__aremel(this.runtime);
		this.runtime.start();
		window.aremel = this.root;
	}

	static collectNodes(doc:DomDocument): Array<DomElement> {
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

	//TODO: use DOM queries to lookup the script!
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

	static requester(base:URL, req:RequestObj, cb:(s:string)=>void) {
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
		xhttp.open(req.post ? 'POST' : 'GET', req.url, true);
		var params = undefined;
		// https://stackoverflow.com/a/9713078
		if (req.post && req.params) {
			xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			// Turn the data object into an array of URL-encoded key/value pairs.
			let urlEncodedDataPairs = [], name;
			for (name in req.params) {
				urlEncodedDataPairs.push(
					encodeURIComponent(name) + '='
					+ encodeURIComponent(req.params[name]));
			}
			params = urlEncodedDataPairs.join('&');
		}
		xhttp.send(params);
	}

}
