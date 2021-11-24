import {Node, Parser} from "acorn";
import {full, simple} from "acorn-walk";
const escodegen = require("escodegen")

describe("test acorn basics (TS)", () => {

	it("should parse '1 + 1'", () => {
		let node:Node = Parser.parse('1 + 1', {ecmaVersion: 2015});
		expect(node.type).toBe('Program');
		expect(escodegen.generate(node)).toBe('1 + 1;');
	});

	it("should parse '1\n+ 1'", () => {
		let node:Node = Parser.parse(`1
		+ 1`, {ecmaVersion: 2015});
		expect(node.type).toBe('Program');
		expect(escodegen.generate(node)).toBe(`1 + 1;`);
	});

	it("should parse '1/*NL*/+ 1'", () => {
		let node:Node = Parser.parse(`1
		+ 1`, {ecmaVersion: 2015});
		expect(node.type).toBe('Program');
		expect(escodegen.generate(node)).toBe(`1 + 1;`);
	});

	it("should simple-walk 'a + 1'", () => {
		let node = Parser.parse('a + 1', {ecmaVersion: 2015});
		var identifiers:Array<string> = [];
		var literals:Array<number> = [];
		simple(node, {
			Literal(n:any) {
				literals.push(n.value);
			},
			Identifier(n:any) {
				identifiers.push(n.name);
			},
		});
		expect(identifiers.length).toBe(1);
		expect(identifiers[0]).toBe('a');
		expect(literals.length).toBe(1);
		expect(literals[0]).toBe(1);
	});

	it("should full-walk 'a + 1'", () => {
		let node = Parser.parse('a + 1', {ecmaVersion: 2015});
		var identifiers:Array<string> = [];
		var literals:Array<number> = [];
		full(node, (node:any, state, type) => {
			switch (type) {
				case 'Identifier': identifiers.push(node.name); break;
				case 'Literal': literals.push(node.value); break;
			}
		});
		expect(identifiers.length).toBe(1);
		expect(identifiers[0]).toBe('a');
		expect(literals.length).toBe(1);
		expect(literals[0]).toBe(1);
	});

});
