// https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;
export const DOCUMENT_NODE = 9;

// https://developer.mozilla.org/en-US/docs/Web/API/NodeList
export interface DomNodeList {
	length: number;
	item: (i:number)=>DomNode|undefined;
	forEach: (cb:(n:DomNode,i:number)=>void)=>void;
	// serverRemove: (n:DomNode)=>void;
	// serverAppend: (n:DomNode)=>void;
	// serverInsert: (n:DomNode, ref:DomNode)=>void;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Node
export interface DomNode {
	nodeType: number;
	ownerDocument: DomDocument | undefined;
	parentElement: DomElement | undefined;
}

export interface DomTextNode extends DomNode {
	nodeValue: string;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Element
export interface DomElement extends DomNode {
	tagName: string; 
	childNodes: DomNodeList;
	childElementCount: number;
	firstChild: DomNode|undefined;
	firstElementChild: DomElement|undefined;
	previousElementSibling: DomElement|undefined;
	appendChild: (n:DomNode)=>void;
	insertBefore: (n:DomNode,ref:DomNode)=>void;
	removeChild: (n:DomNode)=>void;
	classList: {
		add: (n:string)=>void,
		remove: (n:string)=>void,
	};
	style: {
		setProperty: (key:string, val:string)=>void;
		removeProperty: (key:string)=>void;
	};
	getAttribute: (key:string)=>string|undefined;
	setAttribute: (key:string, val:string)=>void;
	removeAttribute: (key:string)=>void;
	addEventListener: (t:string, l:(ev:any)=>void)=>void;
	removeEventListener: (t:string, l:(ev:any)=>void)=>void;
	outerHTML: string;
	innerHTML: string;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Document
export interface DomDocument extends DomNode {
	createElement: (tagName:string)=>DomElement;
	createTextNode: (text:string)=>DomTextNode;
	firstElementChild: DomElement|undefined;
}
