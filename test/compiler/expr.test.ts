import { JS_NOTNULL_FN } from "../../src/compiler/app";
import { patchExpr, prepareExpr } from "../../src/compiler/expr";

describe("test expressions", () => {

	// =========================================================================
	// prepareExpr()
	// =========================================================================

	it("should prepare empty expressions", () => {
		expect(prepareExpr('')).toBe("''");
		expect(prepareExpr('[[]]')).toBe("");
		expect(prepareExpr('[[ ]]')).toBe(" ");
	});

	it("should prepare quotes", () => {
		expect(prepareExpr('x')).toBe("'x'");
		expect(prepareExpr('"')).toBe("'\\\"'");
		expect(prepareExpr("'")).toBe("'\\\''");
	});

	it("should prepare complex expressions", () => {
		expect(prepareExpr(" [[1 + 2]]")).toBe(`' '+${JS_NOTNULL_FN}(1 + 2)`);
		expect(prepareExpr("[[1 + 2]] ")).toBe(`${JS_NOTNULL_FN}(1 + 2)+' '`);
		expect(prepareExpr(" [[1 + 2]] ")).toBe(`' '+${JS_NOTNULL_FN}(1 + 2)+' '`);
		expect(prepareExpr('[[f("\"hello\"")]]')).toBe('f("\"hello\"")');
		expect(prepareExpr("[[f('\"hello\"')]]")).toBe('f(\'"hello"\')');
		expect(prepareExpr("sum: [[1 + 2]]")).toBe(`'sum: '+${JS_NOTNULL_FN}(1 + 2)`);
	});

	it("should prepare function expressions", () => {
		expect(prepareExpr("[[function() {return 1}]]")).toBe('function() {return 1}');
		expect(prepareExpr("[[function() {return 1\n" + "}]]")).toBe('function() {return 1\n' + '}');
		expect(prepareExpr(`[[if (true) {
			trace('ok');
		} else {
			trace('ko');
		}]]`)).toBe(`if (true) {
			trace('ok');
		} else {
			trace('ko');
		}`);
		expect(prepareExpr("[[function(x) {return x * 2}]]")).toBe('function(x) {return x * 2}');
		expect(prepareExpr("[[function\n(x) {return x * 2}]]")).toBe('function\n(x) {return x * 2}');
		expect(prepareExpr("[[(x) -> {return x * 2}]]")).toBe('(x) -> {return x * 2}');
		expect(prepareExpr("[[\n(x) -> {return x * 2}]]")).toBe('\n(x) -> {return x * 2}');
		expect(prepareExpr("[[(x) ->\n{return x * 2}]]")).toBe('(x) ->\n{return x * 2}');
		expect(prepareExpr(`[[function(x, y) {
            return x * y;
        }]]`)).toBe(`function(x, y) {
            return x * y;
        }`);
	});

	it("should prepare data expressions", () => {
		expect(prepareExpr(`[[ [{list:[1,2]}, {list:["a","b","c"]}] ]]`))
		.toBe(' [{list:[1,2]}, {list:["a","b","c"]}] ');
		expect(prepareExpr(`[[ [
			{list:[1,2]},
			{list:["a","b","c"]}
		] ]]`))
		.toBe(` [
			{list:[1,2]},
			{list:["a","b","c"]}
		] `);
		expect(prepareExpr(`[[[
			{list:[1,2]},
			{list:["a","b","c"]}
		]]]`))
		.toBe(`[
			{list:[1,2]},
			{list:["a","b","c"]}
		]`);
	});

	// =========================================================================
	// patchExpr()
	// =========================================================================

	// it("should replace direct access with getter call", () => {
	// 	expect(patchExpr('v1 + 2')).toBe('__get_v1() + 2');
	// });

});
