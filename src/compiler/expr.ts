import { Node, Parser } from "acorn";
import { full } from "acorn-walk";
import { DOM_EXP_MARKER1, DOM_EXP_MARKER2, JS_NOTNULL_FN } from "./app";
import { StringBuf } from "./util";
const escodegen = require("escodegen");

export interface Expr {
	src: string,
	code: string,
	origin?: string,
	lineNr?: number,
}

export function isDynamic(s:string) {
	return s.indexOf(DOM_EXP_MARKER1) >= 0;
}

export function parseExpr(s:string, origin?:string, lineNr=1): Expr {
	var src = prepareExpr(s);
	var expr = {src:src, code:'', origin:origin, lineNr:lineNr};
	return expr;
}

export function prepareExpr(s:string): string {
	var sb = new StringBuf();
	var sep = '';
	var exprStart, exprEnd;
	if (s.startsWith(DOM_EXP_MARKER1) && s.endsWith(DOM_EXP_MARKER2)) {
		exprStart = exprEnd = '';
	} else {
		exprStart = JS_NOTNULL_FN + '(';
		exprEnd = ')';
	}
	var i = 0, i1, i2;
	while ((i1 = s.indexOf(DOM_EXP_MARKER1, i)) >= 0
			&& (i2 = s.indexOf(DOM_EXP_MARKER2, i1)) >= 0) {
		while ((i2 + 2) < s.length && s.charAt(i2 + 2) == ']') i2++;
		sb.add(sep); sep = '+';
		if (i1 > i) {
			sb.add("'" + escape(s.substring(i, i1)) + "'+");
		}
		sb.add(exprStart);
		sb.add(s.substring(i1 + DOM_EXP_MARKER1.length, i2));
		sb.add(exprEnd);
		i = i2 + DOM_EXP_MARKER2.length;
	}
	if (i < s.length || sep == '') {
		sb.add(sep);
		sb.add("'" + escape(s.substr(i)) + "'");
	}
	return sb.toString();
}

function escape(s:string): string {
	s = s.replace("'", "\\'");
	s = s.replace('"', '\\"');
	return s;
}

export function patchExpr(expr:Expr, paths?:Set<string>, patchData=false): string {
	var locals = new Set(['null', 'true', 'false', 'console', 'document', 'window']);
	var node = Parser.parse(expr.src, {ecmaVersion: 2015});
	!paths ? paths = new Set() : null;
	full(node, (node:any, state, type) => {
		switch (type) {
			case 'Identifier':
				if (!locals.has(node.name)) {

				}
				break;
		}
	});
	var ret = escodegen.generate(node);
	return ret;
}

/*
(1) turns accesses to non-local, non '__' identifiers into calls to their getters
(2) turns assignments to non-local, non '__' identifiers into calls to their setters
(3) collects local identifiers
(4) special treatment for unary operators on non-local, non '__' identifiers
*/
function patchIds(node:Node) {

}
