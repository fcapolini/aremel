import { DOM_ID_ATTR } from "../compiler/app";
import { DomDocument, DomElement, ELEMENT_NODE } from "../shared/dom";
import { make, PageObj, RuntimeEventSource, RuntimeObj } from "../shared/runtime";

export default class AremelClient {
	pageObj: PageObj;
	runtime: RuntimeObj;

	constructor(doc:DomDocument, window:RuntimeEventSource) {
		this.pageObj = {
			doc: doc,
			nodes: this.collectNodes(doc),
			window: window
		};
		this.runtime = make(this.pageObj);
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

}
