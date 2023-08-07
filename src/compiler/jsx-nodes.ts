import acorn from "acorn";

export interface JSXElement extends acorn.Node {
  children: any;
  openingElement: JSXOpeningElement;
}

export interface JSXOpeningElement extends acorn.Node {
  attributes: JSXAttribute[];
}

export interface JSXAttribute extends acorn.Node {
  name: JSXIdentifier;
  value: acorn.Node;
}

export interface JSXIdentifier extends acorn.Node {
  name: string;
}
