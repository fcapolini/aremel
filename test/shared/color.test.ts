import { color2Components, components2Color, fullRgb, mixColors } from "../../src/shared/color";

describe("test color", () => {

	it("should expand #rgb to #rrggbb", () => {
		expect(fullRgb('#cde')).toBe('#ccddee');
		expect(fullRgb('#ccddee')).toBe('#ccddee');
		expect(fullRgb('xyz')).toBe('xyz');
	});

	it("should parse color string", () => {
		expect(color2Components('#cde')).toStrictEqual({r:0xCC, g:0xDD, b:0xEE});
		expect(color2Components('#ccddee')).toStrictEqual({r:0xCC, g:0xDD, b:0xEE});
		expect(color2Components('rgb(10,20,30)')).toStrictEqual({r:10, g:20, b:30});
		expect(color2Components('rgb(10%,20%,30%)')).toStrictEqual({r:25, g:51, b:76});
		expect(color2Components('rgba(10,20,30,.4)')).toStrictEqual({r:10, g:20, b:30, a:.4});
		expect(color2Components('rgba(10%,20%,30%,.4)')).toStrictEqual({r:25, g:51, b:76, a:.4});
	});

	it("should unparse color", () => {
		expect(components2Color({r:0xC, g:0xDD, b:0xE0})).toBe('#0cdde0');
		expect(components2Color({r:10, g:20, b:30, a:.5})).toBe('rgba(10,20,30,0.5)');
	});

	it("should mix colors", () => {
		expect(mixColors("#ff0080", "#002080", .5)).toBe('#801080');
	});

});
