import { Source } from "./loader";

export class CodeError implements Error {
  name: string;
  message: string;
  origin?: acorn.Node;
  stack?: string | undefined;

  constructor(name: string, message: string, origin?: acorn.Node) {
    this.name = name;
    this.message = message;
    this.origin = origin;
  }
}

export default class Code {
  source: Source;
  errors: CodeError[];
  ast: acorn.Node | null;

  constructor(source: Source) {
    this.source = source;
    this.errors = [];
    this.ast = this.#transform();
  }

  #transform(): acorn.Node | null {
    return this.ast;
  }
}
