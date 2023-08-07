import acorn from "acorn";
import jsx from "acorn-jsx";
import * as walk from "acorn-walk";
import fs from "fs";
import path from "path";
import { JSXElement } from "./jsx-nodes";
require("acorn-jsx-walk").extend(walk.base);

const MAX_NESTINGS = 100;
const INCLUDE_TAG = '$include';
const IMPORT_TAG = '$import';
const INCLUDE_IMPORT_ATTR = '$src';

export interface Source {
  fnames: string[];
  errors: SourceError[];
  ast: acorn.Node | null;
}

export class SourceError implements Error {
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

export default class Loader {
  rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async load(fname: string): Promise<Source> {
    const impl = new LoaderInstance(this.rootPath);
    await impl.load(fname);
    return impl;
  }
}

class LoaderInstance implements Source {
  rootPath: string;
  // as Source
  fnames: string[];
  errors: SourceError[];
  ast: acorn.Node | null;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.fnames = [];
    this.errors = [];
    this.ast = null;
  }

  async load(fname: string) {
    this.ast = await this.#load('', fname);
    this.ast && this.#joinSiblingTexts(this.ast);
  }

  async #load(
    cwd: string,
    fname: string,
    nesting = 0,
    origin?: acorn.Node,
    once = false
  ): Promise<acorn.Node | null> {
    //
    // pathname
    //
    const abspath = path.normalize(path.join(this.rootPath, cwd, fname));
    const relpath = path.relative(this.rootPath, abspath);
    if (!abspath.startsWith(this.rootPath)) {
      this.#addError(relpath, "Forbidden access", origin);
      return null;
    }
    if (nesting > MAX_NESTINGS) {
      this.#addError(abspath, "Too many nested inclusions", origin);
      return null;
    }
    cwd = path.dirname(relpath);
    fname = path.basename(relpath);
    if (once && this.fnames.indexOf(relpath) >= 0) {
      return null;
    }
    this.fnames.indexOf(relpath) < 0 && (this.fnames.push(relpath));
    //
    // loading
    //
    let text: string;
    try {
      text = await fs.promises.readFile(abspath, { encoding: 'utf8' });
    } catch (err) {
      this.#addError(relpath, `${err}`, origin);
      return null;
    }
    //
    // parsing
    //
    let ast: acorn.Node;
    try {
      ast = acorn.Parser.extend(jsx()).parse(
        text, {
          ecmaVersion: 2016,
          sourceType: 'script',
          locations: true,
          sourceFile: relpath
      });
    } catch (err) {
      this.#addError(relpath, `${err}`, origin);
      return null;
    }
    nesting === 0 && (this.ast = ast);
    //
    // inclusions
    //
    await this.#processInclusions(ast, cwd, nesting);

    return ast;
  }

  async #processInclusions(root: acorn.Node, cwd: string, nesting: number) {
    const includes: any[] = [];
    const canNormalizeText: boolean[] = [];
    walk.ancestor(root, {
      JSXOpeningElement: (node: any, _, ancestors) => {
        const tagname = node.name.name;
        if (tagname === INCLUDE_TAG || tagname === IMPORT_TAG) {
          includes.push({
            parent: ancestors[ancestors.length - 3],
            element: ancestors[ancestors.length - 2]
          });
        }
        if (!node.selfClosing) {
          if (tagname === 'pre') {
            canNormalizeText.push(false);
          } else {
            canNormalizeText.push(peek(canNormalizeText, true));
          }
        }
      },
      JSXClosingElement: () => {
        canNormalizeText.pop();
      },
      JSXText: (node: any) => {
        if (peek(canNormalizeText, true)) {
          node.value = normalizeText(node.value);
        }
      }
    });
    for (let inc of includes) {
      const tagname = inc.element.openingElement.name.name;
      const attrs = inc.element.openingElement.attributes;
      if (
        attrs.length === 1 &&
        attrs[0].name.name === INCLUDE_IMPORT_ATTR &&
        attrs[0].value.type === 'Literal' &&
        attrs[0].value.value.trim().length > 0
      ) {
        const once = (tagname === IMPORT_TAG);
        const fname = attrs[0].value.value.trim();
        const ast = await this.#load(cwd, fname, nesting + 1, inc.element, once);
        if (!ast) {
          const i = inc.parent.children.indexOf(inc.element);
          inc.parent.children.splice(i, 1);
          continue;
        }
        const incRoot = this.#getRootJSXElement(ast);
        if (!incRoot) {
          this.#addError(
            root.sourceFile as string,
            'Invalid $include/$import content',
            inc.element
          );
          continue;
        }
        this.#processInclusion(inc.parent, inc.element, incRoot);
      } else {
        this.#addError(
          root.sourceFile as string,
          'Invalid $include/$import',
          inc.element
        );
      }
    }
  }

  #processInclusion(parent: any, include: any, incRoot: JSXElement) {
    //
    // incRoot children
    //
    const i = parent.children.indexOf(include);
    parent.children.splice(i, 1, ...incRoot.children);
    //
    // incRoot attributes
    //
    const parentAttrs = parent.openingElement.attributes;
    const parentNames = new Set(parentAttrs.map((a: any) => a.name.name));
    const incAttrs = incRoot.openingElement.attributes;
    for (let attr of incAttrs) {
      const name = attr.name.name;
      if (!parentNames.has(name)) {
        parentAttrs.push(attr);
      }
    }
  }

  #joinSiblingTexts(root: acorn.Node) {
    const toRemove: any[] = [];
    walk.simple(root, {
      JSXElement: (node: any) => {
        let tt: any[] = [];
        function join() {
          if (tt.length > 1) {
            tt[0].value = normalizeText(tt.map(t => t.value).join(''));
            toRemove.push({
              parent: node,
              i: node.children.indexOf(tt[1]),
              n: tt.length - 1
            });
          }
          tt.length && (tt = []);
        }
        for (let child of node.children) {
          if (child.type === 'JSXText') {
            tt.push(child);
          } else {
            join();
          }
        }
        join();
      }
    });
    toRemove.forEach(obj => {
      obj.parent.children.splice(obj.i, obj.n);
    });
  }

  #getRootJSXElement(root: acorn.Node): JSXElement | null {
    let ret: JSXElement | null = null;
    try {
      walk.simple(root, {
        JSXElement(node: any) {
          !ret && (ret = node);
          throw '';
        }
      });
    } catch (ignored) {}
    return ret;
  }

  #addError(name: string, message: string, origin?: acorn.Node) {
    this.errors.push(new SourceError(name, message, origin));
  }
}

export function normalizeText(s?: string): string | undefined {
  s = s?.split(/\n\s+/).join('\n').split(/\s{2,}/).join(' ');
  s = s?.split(/\n{2,}/).join('\n');
  return s;
}

export function peek(a: any[], defval: any): any | null {
  return (a.length > 0 ? a[a.length - 1] : defval);
}
