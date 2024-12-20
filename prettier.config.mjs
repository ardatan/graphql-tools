import prettierConfig from '@theguild/prettier-config';

export default {
  ...prettierConfig,
  plugins: [...prettierConfig.plugins, 'prettier-plugin-tailwindcss'],
};
