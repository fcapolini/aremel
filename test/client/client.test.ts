import AremelClient from "../../src/client/client";
import Preprocessor from "../../src/compiler/preprocessor";
import AramelServer from "../../src/server/server";
import { DomDocument } from "../../src/shared/dom";

let prepro: Preprocessor;

describe("test client", () => {

	beforeAll(() => {
		prepro = new Preprocessor(process.cwd() + '/test/client/pages');
	});

	it("should load page1.html", () => {
		var url = new URL('http://localhost/page1.html');
		var doc = AramelServer.getPage(prepro, url);
		var client = new AremelClient(doc as unknown as DomDocument);
		expect(client.nodes.size).toBe(3);
	});

});
