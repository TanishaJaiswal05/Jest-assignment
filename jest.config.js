/**
 * Jest configuration for the TypeScript-based Express app.
 * It tells Jest to use ts-jest and run tests from the tests folder.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  clearMocks: true,
  verbose: true
};
