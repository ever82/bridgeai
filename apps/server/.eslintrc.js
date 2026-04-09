/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@visionshare/config/eslint'],
  parserOptions: {
    project: './tsconfig.json',
  },
};
