import { COMMENT_NODE } from "../shared/dom";
import { DOM_EXP_MARKER1 } from "./app";

export function isDynamic(s:string) {
	return s.indexOf(DOM_EXP_MARKER1) >= 0;
}

export function parseExpr(s:string, origin?:string, lineNr=1): Expr {
	var code = prepareExpr(s);
	var expr = new Expr(code, origin, lineNr);
	return expr;
}

export function prepareExpr(s:string): string {
	//TODO
	return s;
}

export function patchExpr(expr:Expr, paths:Set<string>, patchData=false): Expr {
	//TODO
	return expr;
}

export class Expr {
	code: string;

	constructor(code:string, origin?:string, lineNr=1) {
		this.code = code;
	}

	toString(): string {
		//TODO
		return this.code;
	}

}
