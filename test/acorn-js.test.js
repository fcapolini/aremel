const acorn = require("acorn")
const walk = require("acorn-walk");

describe("test acorn basics (JS)", () => {

	it("should parse '1 + 1'", () => {
		let node = acorn.parse('1 + 1', {ecmaVersion: 2015});
		expect(node.type).toBe('Program');
	});

	it("should simple-walk 'a + 1'", () => {
		let node = acorn.parse('a + 1', {ecmaVersion: 2015});
		var identifiers = [];
		var literals = [];
		walk.simple(node, {
			Literal(n) {
				literals.push(n);
			},
			Identifier(n) {
				identifiers.push(n);
			},
		});
		expect(identifiers.length).toBe(1);
		expect(identifiers[0].name).toBe('a');
		expect(literals.length).toBe(1);
		expect(literals[0].value).toBe(1);
	});

	it("should full-walk 'a + 1'", () => {
		let node = acorn.parse('a + 1', {ecmaVersion: 2015});
		var identifiers = [];
		var literals = [];
		walk.full(node, (node, state, type) => {
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
