import { Source } from 'graphql';
import { parse } from '@babel/parser';
import traversePkg from '@babel/traverse';
import { ExpressionStatement, TemplateLiteral } from '@babel/types';
import generateConfig from './config.js';
import { getExtNameFromFilePath } from './libs/extname.js';
import { freeText } from './utils.js';
import createVisitor, { PluckedContent } from './visitor.js';

function getDefault<T>(module: T & { default?: T }): T {
  return module.default || module;
}

const traverse = getDefault(traversePkg);

/**
 * Additional options for determining how a file is parsed.
 */
export interface GraphQLTagPluckOptions {
  /**
   * Additional options for determining how a file is parsed. An array of packages that are responsible for exporting the GraphQL string parser function. The following modules are supported by default:
   * ```js
   * {
   *   modules: [
   *     {
   *       // import gql from 'graphql-tag'
   *       name: 'graphql-tag',
   *     },
   *     {
   *       name: 'graphql-tag.macro',
   *     },
   *     {
   *       // import { graphql } from 'gatsby'
   *       name: 'gatsby',
   *       identifier: 'graphql',
   *     },
   *     {
   *       name: 'apollo-server-express',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'apollo-server',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'react-relay',
   *       identifier: 'graphql',
   *     },
   *     {
   *       name: 'apollo-boost',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'apollo-server-koa',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'apollo-server-hapi',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'apollo-server-fastify',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: ' apollo-server-lambda',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'apollo-server-micro',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'apollo-server-azure-functions',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'apollo-server-cloud-functions',
   *       identifier: 'gql',
   *     },
   *     {
   *       name: 'apollo-server-cloudflare',
   *       identifier: 'gql',
   *     },
   *   ];
   * }
   * ```
   */
  modules?: Array<{ name: string; identifier?: string }>;
  /**
   * The magic comment anchor to look for when parsing GraphQL strings. Defaults to `graphql`.
   */
  gqlMagicComment?: string;
  /**
   * The name of a custom Vue block that contains raw GraphQL to be plucked.
   */
  gqlVueBlock?: string;
  /**
   * Allows to use a global identifier instead of a module import.
   * ```js
   * // `graphql` is a global function
   * export const usersQuery = graphql`
   *   {
   *     users {
   *       id
   *       name
   *     }
   *   }
   * `;
   * ```
   */
  globalGqlIdentifierName?: string | string[];
  /**
   * Set to `true` in order to get the found documents as-is, without any changes indentation changes
   */
  skipIndent?: boolean;
  /**
   * A function that allows custom extraction of GraphQL strings from a file.
   */
  pluckStringFromFile?: (
    code: string,
    node: TemplateLiteral,
    options: Omit<GraphQLTagPluckOptions, 'isGqlTemplateLiteral' | 'pluckStringFromFile'>,
  ) => string | undefined | null;
  /**
   * A custom way to determine if a template literal node contains a GraphQL query.
   * By default, it checks if the leading comment is equal to the `gqlMagicComment` option.
   */
  isGqlTemplateLiteral?: (
    node: TemplateLiteral | ExpressionStatement,
    options: Omit<GraphQLTagPluckOptions, 'isGqlTemplateLiteral' | 'pluckStringFromFile'>,
  ) => boolean | undefined;
}

const supportedExtensions = [
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
  '.flow',
  '.flow.js',
  '.flow.jsx',
  '.vue',
  '.svelte',
  '.astro',
  '.gts',
  '.gjs',
];

// tslint:disable-next-line: no-implicit-dependencies
function parseWithVue(vueTemplateCompiler: typeof import('@vue/compiler-sfc'), fileData: string) {
  const { descriptor } = vueTemplateCompiler.parse(fileData);

  return descriptor.script || descriptor.scriptSetup
    ? vueTemplateCompiler.compileScript(descriptor, { id: Date.now().toString() }).content
    : '';
}

function customBlockFromVue(
  // tslint:disable-next-line: no-implicit-dependencies
  vueTemplateCompiler: typeof import('@vue/compiler-sfc'),
  fileData: string,
  filePath: string,
  blockType: string,
): Source | undefined {
  const { descriptor } = vueTemplateCompiler.parse(fileData);

  const block = descriptor.customBlocks.find(b => b.type === blockType);
  if (block === undefined) {
    return;
  }

  return new Source(block.content.trim(), filePath, block.loc.start);
}

// tslint:disable-next-line: no-implicit-dependencies
function parseWithSvelte(svelte2tsx: typeof import('svelte2tsx'), fileData: string) {
  const fileInTsx = svelte2tsx.svelte2tsx(fileData);
  return fileInTsx.code;
}

// tslint:disable-next-line: no-implicit-dependencies
async function parseWithAstro(astroCompiler: typeof import('@astrojs/compiler'), fileData: string) {
  const fileInTsx = await astroCompiler.transform(fileData);
  return fileInTsx.code;
}

function parseWithAstroSync(
  // tslint:disable-next-line: no-implicit-dependencies
  astroCompiler: typeof import('astrojs-compiler-sync'),
  fileData: string,
) {
  const fileInTsx = astroCompiler.transform(fileData, undefined);
  return fileInTsx.code;
}

function parseWithGlimmer(glimmerSyntax: typeof import('@glimmer/syntax'), fileData: string) {
  const ast = glimmerSyntax.preprocess(fileData);
  return glimmerSyntax.print(ast);
}

/**
 * Asynchronously plucks GraphQL template literals from a single file.
 *
 * Supported file extensions include: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`, `.svelte`, `.astro`
 *
 * @param filePath Path to the file containing the code. Required to detect the file type
 * @param code The contents of the file being parsed.
 * @param options Additional options for determining how a file is parsed.
 */
export const gqlPluckFromCodeString = async (
  filePath: string,
  code: string,
  options: GraphQLTagPluckOptions = {},
): Promise<Source[]> => {
  validate({ code, options });

  const fileExt = extractExtension(filePath);

  let blockSource;
  if (fileExt === '.vue') {
    if (options.gqlVueBlock) {
      blockSource = await pluckVueFileCustomBlock(code, filePath, options.gqlVueBlock);
    }
    code = await pluckVueFileScript(code);
  } else if (fileExt === '.svelte') {
    code = await pluckSvelteFileScript(code);
  } else if (fileExt === '.astro') {
    code = await pluckAstroFileScript(code);
  }

  const sources = parseCode({ code, filePath, options }).map(
    t => new Source(t.content, filePath, t.loc.start),
  );
  if (blockSource) {
    sources.push(blockSource);
  }
  return sources;
};

/**
 * Synchronously plucks GraphQL template literals from a single file
 *
 * Supported file extensions include: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mjs`, `.cjs`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`, `.svelte`, `.astro`, `.gts`, `.gjs`
 *
 * @param filePath Path to the file containing the code. Required to detect the file type
 * @param code The contents of the file being parsed.
 * @param options Additional options for determining how a file is parsed.
 */
export const gqlPluckFromCodeStringSync = (
  filePath: string,
  code: string,
  options: GraphQLTagPluckOptions = {},
): Source[] => {
  validate({ code, options });

  const fileExt = extractExtension(filePath);

  let blockSource;
  if (fileExt === '.vue') {
    if (options.gqlVueBlock) {
      blockSource = pluckVueFileCustomBlockSync(code, filePath, options.gqlVueBlock);
    }
    code = pluckVueFileScriptSync(code);
  } else if (fileExt === '.svelte') {
    code = pluckSvelteFileScriptSync(code);
  } else if (fileExt === '.astro') {
    code = pluckAstroFileScriptSync(code);
  } else if (fileExt === '.gts' || fileExt === '.gjs') {
    code = pluckGlimmerFileScriptSync(code);
  }

  const sources = parseCode({ code, filePath, options }).map(
    t => new Source(t.content, filePath, t.loc.start),
  );
  if (blockSource) {
    sources.push(blockSource);
  }
  return sources;
};

export function parseCode({
  code,
  filePath,
  options,
}: {
  code: string;
  filePath: string;
  options: GraphQLTagPluckOptions;
}): PluckedContent[] {
  const out: any = { returnValue: null };
  const ast = parse(code, generateConfig(filePath, code, options));
  const visitor = createVisitor(code, out, options);

  traverse(ast as any, visitor);

  return out.returnValue || [];
}

function validate({ code, options }: { code: string; options: GraphQLTagPluckOptions }) {
  if (typeof code !== 'string') {
    throw TypeError('Provided code must be a string');
  }

  if (!(options instanceof Object)) {
    throw TypeError(`Options arg must be an object`);
  }
}

function extractExtension(filePath: string) {
  const fileExt = getExtNameFromFilePath(filePath);

  if (fileExt) {
    if (!supportedExtensions.includes(fileExt)) {
      throw TypeError(`Provided file type must be one of ${supportedExtensions.join(', ')} `);
    }
  }

  return fileExt;
}

const MissingVueTemplateCompilerError = new Error(
  freeText(`
    GraphQL template literals cannot be plucked from a Vue template code without having the "@vue/compiler-sfc" package installed.
    Please install it and try again.

    Via NPM:

        $ npm install @vue/compiler-sfc

    Via Yarn:

        $ yarn add @vue/compiler-sfc
  `),
);

const MissingSvelteTemplateCompilerError = new Error(
  freeText(`
    GraphQL template literals cannot be plucked from a Svelte template code without having the "svelte2tsx" & "svelte" package installed.
    Please install it and try again.

    Via NPM:

        $ npm install svelte2tsx svelte

    Via Yarn:

        $ yarn add svelte2tsx svelte
  `),
);

const MissingAstroCompilerError = new Error(
  freeText(`
    GraphQL template literals cannot be plucked from a Astro template code without having the "@astrojs/compiler" package installed.
    Please install it and try again.

    Via NPM:

        $ npm install @astrojs/compiler

    Via Yarn:

        $ yarn add @astrojs/compiler
  `),
);

const MissingGlimmerCompilerError = new Error(
  freeText(`
        GraphQL template literals cannot be plucked from a Glimmer template code without having the "@glimmer/syntax" package installed.
        Please install it and try again.

        Via NPM:

            $ npm install @glimmer/syntax

        Via Yarn:

            $ yarn add @glimmer/syntax
      `),
);

async function loadVueCompilerAsync() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    return await import('@vue/compiler-sfc');
  } catch {
    throw MissingVueTemplateCompilerError;
  }
}

function loadVueCompilerSync() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    return require('@vue/compiler-sfc');
  } catch {
    throw MissingVueTemplateCompilerError;
  }
}

async function pluckVueFileScript(fileData: string) {
  const vueTemplateCompiler = await loadVueCompilerAsync();
  return parseWithVue(vueTemplateCompiler, fileData);
}

function pluckVueFileScriptSync(fileData: string) {
  const vueTemplateCompiler = loadVueCompilerSync();
  return parseWithVue(vueTemplateCompiler, fileData);
}

async function pluckVueFileCustomBlock(fileData: string, filePath: string, blockType: string) {
  const vueTemplateCompiler = await loadVueCompilerSync();
  return customBlockFromVue(vueTemplateCompiler, fileData, filePath, blockType);
}

function pluckVueFileCustomBlockSync(fileData: string, filePath: string, blockType: string) {
  const vueTemplateCompiler = loadVueCompilerSync();
  return customBlockFromVue(vueTemplateCompiler, fileData, filePath, blockType);
}

async function pluckSvelteFileScript(fileData: string) {
  let svelte2tsx: typeof import('svelte2tsx');
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    svelte2tsx = await import('svelte2tsx');
  } catch {
    throw MissingSvelteTemplateCompilerError;
  }

  return parseWithSvelte(svelte2tsx, fileData);
}

function pluckSvelteFileScriptSync(fileData: string) {
  let svelte2tsx: typeof import('svelte2tsx');

  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    svelte2tsx = require('svelte2tsx');
  } catch {
    throw MissingSvelteTemplateCompilerError;
  }

  return parseWithSvelte(svelte2tsx, fileData);
}

async function pluckAstroFileScript(fileData: string) {
  let astroCompiler: typeof import('@astrojs/compiler');
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    astroCompiler = await import('@astrojs/compiler');
  } catch {
    throw MissingAstroCompilerError;
  }

  return parseWithAstro(astroCompiler, fileData);
}

function pluckAstroFileScriptSync(fileData: string) {
  let astroCompiler: typeof import('astrojs-compiler-sync');
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    astroCompiler = require('astrojs-compiler-sync');
  } catch {
    throw MissingAstroCompilerError;
  }

  return parseWithAstroSync(astroCompiler, fileData);
}

function pluckGlimmerFileScriptSync(fileData: string) {
  let glimmerSyntax: typeof import('@glimmer/syntax');
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    glimmerSyntax = require('@glimmer/syntax');
  } catch {
    throw MissingGlimmerCompilerError;
  }

  return parseWithGlimmer(glimmerSyntax, fileData);
}
