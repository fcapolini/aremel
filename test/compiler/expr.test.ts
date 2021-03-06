import { JS_NOTNULL_FN } from "../../src/shared/runtime";
import { prepareExpr } from "../../src/compiler/expr";

describe("test expressions", () => {

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

	it("should prepare complex class expression", () => {
		expect(prepareExpr(`btn btn-[[outline ? 'outline-' : '']][[type]][[nowrap ? ' text-nowrap' : '']][[size ? ' btn-'+size : '']]`))
		.toBe(`'btn btn-'+__nn(outline ? 'outline-' : '')+__nn(type)+__nn(nowrap ? ' text-nowrap' : '')+__nn(size ? ' btn-'+size : '')`);
	});

});
