/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
// https://jestjs.io/docs/configuration
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '\\.test\\.ts$',
};