import { DOM_ID_ATTR } from "../compiler/app";
import { DomDocument, DomElement, ELEMENT_NODE } from "../shared/dom";

export default class AremelClient {
	nodes: Map<string,DomElement>;

	constructor(doc:DomDocument) {
		var that = this;
		this.nodes = new Map<string,DomElement>();
		function f(e:DomElement) {
			var id = e.getAttribute(DOM_ID_ATTR);
			if (id != null) {
				that.nodes.set(id, e);
			}
			e.childNodes.forEach((n, i) => {
				if (n.nodeType === ELEMENT_NODE) {
					f(n as DomElement);
				}
			});
		}
		f(doc.firstElementChild as DomElement);
	}

}
