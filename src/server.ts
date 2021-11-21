import {Node, Parser} from "acorn";
import {full, fullAncestor} from "acorn-walk";

var node = Parser.parse('{v + ""; 1;}', {ecmaVersion: 2015});
// console.log(node);

// full(node, (node:any, state, type) => {
// 	console.log(type);
// });

// https://github.com/estree/estree/blob/master/es5.md
// https://github.com/estree/estree/blob/master/es2015.md
function toString(n:any): string {
	var ret = n.type;
	switch (ret) {
		case 'Identifier':
			ret += `("${n.name}")`;
			break;
		case 'Literal':
			// https://stackoverflow.com/a/9436948
			if (typeof n.value === 'string' || n.value instanceof String) {
				ret += `("${n.value}")`;
			} else {
				ret += `(${n.value})`;
			}
			break;
	}
	return ret;
}

fullAncestor(node, (node:any, ancestors:Array<any>, type) => {
	console.log(`${ancestors.map(n => toString(n))}`);
});
