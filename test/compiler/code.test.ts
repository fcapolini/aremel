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

	it("should collect patch read access", () => {
		var expr:Expr = {src:'v1', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(1);
		expect(refs.has('v1')).toBeTruthy();
		expect(expr.code).toBe('__get_v1();');
	});

	it("should collect patch write access", () => {
		var expr:Expr = {src:'v1 = 1', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(1);
		expect(refs.has('v1')).toBeTruthy();
		expect(expr.code).toBe('__set_v1(1);');
	});

});
