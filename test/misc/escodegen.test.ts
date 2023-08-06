import { assert } from "chai";
import { parseScript } from "esprima";
import {
  CallExpression,
  ArrowFunctionExpression,
  BaseFunction, BinaryExpression, BlockStatement, ExpressionStatement,
  FunctionDeclaration, Literal, ReturnStatement, TryStatement
} from "estree";
import { generate } from "escodegen";

describe('esprima/codegen', function () {

  describe('parsing', function () {

    it('dummy', function() {
      // const ast = parseScript(`let i = 0;`);
      // const ast = parseScript(`function f(p) {};`);
      // const ast = parseScript(`if (true) { v1 = 1; } v1;`);
      // const ast = parseScript(`function f(a) {}`);
      // const ast = parseScript(`(a) => {}`);
      // const ast = parseScript(`var __this0 = __rt.newScope(parent, 1);`);
      // const ast = parseScript(`__this0 = __rt.newScope(parent, 1);`);
      // const ast = parseScript(`__this0 = 1;`);
      const ast = parseScript(`__this[0] = 1;`);
      assert.exists(ast);
    });
  
    it('should parse a simple expression', function () {
      const ast = parseScript('34 + 8');
      assert.equal(ast.type, 'Program');
      assert.equal(ast.body.length, 1);
      const stm: ExpressionStatement = ast.body[0] as any;
      assert.equal(stm.type, 'ExpressionStatement');
      const exp: BinaryExpression = stm.expression as any;
      assert.equal(exp.type, 'BinaryExpression');
      assert.equal(exp.operator, '+');
      const lft: Literal = exp.left as any;
      const rgt: Literal = exp.right as any;
      assert.equal(lft.value, 34);
      assert.equal(rgt.value, 8);
    });

    it('should parse a function', function () {
      const ast = parseScript(`function f1() {
        return 1;
      }`);
      assert.equal(ast.type, 'Program');
      assert.equal(ast.body.length, 1);
      const stm: FunctionDeclaration = ast.body[0] as any;
      assert.equal(stm.type, 'FunctionDeclaration');
      assert.equal(stm.id?.type, 'Identifier');
      assert.equal(stm.id?.name, 'f1');
      assert.equal(stm.body.type, 'BlockStatement');
      assert.equal(stm.body.body.length, 1);
      const st2: ReturnStatement = stm.body.body[0] as any;
      assert.equal(st2.type, 'ReturnStatement');
      const arg: Literal = st2.argument as any;
      assert.equal(arg.type, 'Literal');
      assert.equal(arg.value, 1);
    });

    it('should parse a function call', function () {
      const ast = parseScript(`f1(1)`);
      assert.equal(ast.type, 'Program');
      assert.equal(ast.body.length, 1);
      const cll: CallExpression = ast.body[0] as any;
    });

    it('should parse a try/finally block', function () {
      const ast = parseScript(`try {} finally {}`);
      assert.equal(ast.type, 'Program');
      assert.equal(ast.body.length, 1);
      const stm: TryStatement = ast.body[0] as any;
      assert.equal(stm.type, 'TryStatement');
      assert.equal(stm.block.type, 'BlockStatement');
      assert.equal(stm.handler, null);
      assert.equal(stm.finalizer?.type, 'BlockStatement');
    });

    it('should find functions', function () {
      const functions: BaseFunction[] = [];
      parseScript(`
      function f1() {
        return 1;
      }
      const f2 = function() {
        return 2;
      }
      const f3 = () => {
        return 2;
      }
      const f4 = () => 4;
      `, undefined, (node, meta) => {
        if (node.type === "FunctionDeclaration"
          || node.type === 'FunctionExpression'
          || node.type === 'ArrowFunctionExpression') {
          functions.push(node);
        }
      });
      assert.equal(functions.length, 4);
    });
  });

  describe('generation', function () {
    it('should generate a simple expression', function () {
      let str = generate({
        type: 'ExpressionStatement',
        expression: {
          type: 'BinaryExpression',
          operator: '+',
          left: { type: 'Literal', value: 34 },
          right: { type: 'Literal', value: 8 }
        }
      });
      assert.equal(str, '34 + 8;');
      let res = eval(str);
      assert.equal(res, 42);
    });

    it('should generate a try/finally block', function () {
      let str = generate({
        type: 'TryStatement',
        block: { type: 'BlockStatement', body: [] },
        handler: null,
        finalizer: { type: 'BlockStatement', body: [] },
      });
      assert.equal(str, 'try {\n} finally {\n}');
    });
  });

  describe('transformation', function () {
    it('should regenerate a simple expression', function () {
      let ast = parseScript('34  + 8');
      let str = generate(ast);
      assert.equal(str, '34 + 8;');
      let res = eval(str);
      assert.equal(res, 42);
    });

    it('should patch functions', function () {
      const functions: BaseFunction[] = [];
      const ast = parseScript(`
        function f1() {
          return 1;
        }
        const f2 = function() {
          return 2;
        }
        const f3 = () => {
          return 2;
        }
        const f4 = () => 4;
      `, undefined, (node, meta) => {
        if (node.type === "FunctionDeclaration"
          || node.type === 'FunctionExpression'
          || node.type === 'ArrowFunctionExpression') {
          functions.push(node);
        }
      });
      // assert.equal(functions.length, 4);
      functions.forEach(node => {
        let block: BlockStatement
        if (node.body.type === 'BlockStatement') {
          block = node.body;
        } else {
          // it's an Expression
          block = {
            type: 'BlockStatement',
            body: [{ type: 'ReturnStatement', argument: node.body }]
          };
        }
        const newBody: BlockStatement = {
          type: 'BlockStatement',
          body: [{
            type: 'TryStatement',
            block: block,
            handler: null,
            finalizer: {
              type: 'BlockStatement',
              body: []
            },
          }]
        };
        if (node.type === 'ArrowFunctionExpression') {
          (node as ArrowFunctionExpression).expression = false;
        }
        node.body = newBody;
      });
      const str = generate(ast);
      assert.equal(str, 'function f1() {\n'
        + '    try {\n'
        + '        return 1;\n'
        + '    } finally {\n'
        + '    }\n'
        + '}\n'
        + 'const f2 = function () {\n'
        + '    try {\n'
        + '        return 2;\n'
        + '    } finally {\n'
        + '    }\n'
        + '};\n'
        + 'const f3 = () => {\n'
        + '    try {\n'
        + '        return 2;\n'
        + '    } finally {\n'
        + '    }\n'
        + '};\n'
        + 'const f4 = () => {\n'
        + '    try {\n'
        + '        return 4;\n'
        + '    } finally {\n'
        + '    }\n'
        + '};')
    });
  });

});
