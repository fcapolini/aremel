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

	it("shouldn't patch access to '__' ids", () => {
		var expr:Expr = {src:'v1 = __v2', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(1);
		expect(refs.has('v1')).toBeTruthy();
		expect(expr.code).toBe('__set_v1(__v2);');

		var expr:Expr = {src:'__v1 = v2', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(1);
		expect(refs.has('v2')).toBeTruthy();
		expect(expr.code).toBe('__v1 = __get_v2();');
	});

	it("shouldn't patch access to local ids", () => {
		var expr:Expr = {src:'var v1 = v2', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(1);
		expect(refs.has('v2')).toBeTruthy();
		expect(expr.code).toBe('var v1 = __get_v2();');

		var expr:Expr = {src:'var v1 = v2; v3 = v1;', code:''};
		var refs = new Set<string>();
		patchExpr(expr, refs);
		expect(refs.size).toBe(2);
		expect(refs.has('v2')).toBeTruthy();
		expect(refs.has('v3')).toBeTruthy();
		expect(expr.code).toBe('var v1 = __get_v2();__set_v3(v1);');
	});

	// it("should handle update expressions", () => {
	// 	var expr:Expr = {src:'v1++', code:''};
	// 	var refs = new Set<string>();
	// 	patchExpr(expr, refs);
	// 	expect(refs.size).toBe(1);
	// 	expect(refs.has('v1')).toBeTruthy();
	// 	expect(expr.code).toBe('__upd_v1(true, false);');
	// });

	// it("should handle non-'=' assignments", () => {
	// 	var expr:Expr = {src:'v1 += v2', code:''};
	// 	var refs = new Set<string>();
	// 	patchExpr(expr, refs);
	// 	expect(refs.size).toBe(2);
	// 	expect(refs.has('v1')).toBeTruthy();
	// 	expect(refs.has('v2')).toBeTruthy();
	// 	expect(expr.code).toBe('__set_v1(__get_v1() + __get_v2());');
	// });

});
