import { assert } from "chai";
import { JSDOM } from "jsdom";

describe('jsdom', function () {

  it("should execute example", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
    const txt = dom.window.document.querySelector("p")?.textContent;
    assert.equal(txt, 'Hello world');
  });

});
