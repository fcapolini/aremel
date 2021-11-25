import { patchExpr } from "../../src/compiler/code";
import { Expr } from "../../src/compiler/expr";

describe("test code", () => {

	it("should collect references", () => {
		var expr:Expr = {src:'v1', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(1);
		expect(refs.has('v1')).toBeTruthy();
	});

	it("should patch read access", () => {
		var expr:Expr = {src:'v1', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(1);
		expect(refs.has('v1')).toBeTruthy();
		expect(expr.code).toBe('__get_v1();');
	});

	it("should patch write access", () => {
		var expr:Expr = {src:'v1 = 1', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(1);
		expect(refs.has('v1')).toBeTruthy();
		expect(expr.code).toBe('__set_v1(1);');
	});

	it("should patch access", () => {
		var expr:Expr = {src:'v1 = v2', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(2);
		expect(refs.has('v1')).toBeTruthy();
		expect(refs.has('v2')).toBeTruthy();
		expect(expr.code).toBe('__set_v1(__get_v2());');
	});

});
