const prettierConfig = require('@theguild/prettier-config');

module.exports = {
  ...prettierConfig,
  plugins: [...prettierConfig.plugins, 'prettier-plugin-tailwindcss'],
};
