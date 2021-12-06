import { DOM_EXP_MARKER1, DOM_EXP_MARKER2, JS_NOTNULL_FN } from "./app";
import { StringBuf } from "./util";

export interface Expr {
	src: string,
	code: string,
	fndecl?: boolean,
	origin?: string,
	lineNr?: number,
}

export function isDynamic(s:any) {
	return (s && typeof s === 'string' && s.indexOf(DOM_EXP_MARKER1) >= 0);
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
	s = s.replace(/'/g, "\\'");
	s = s.replace(/"/g, '\\"');
	s = s.replace(/\n/g, '\\n');
	s = s.replace(/\r/g, '\\r');
	return s;
}
