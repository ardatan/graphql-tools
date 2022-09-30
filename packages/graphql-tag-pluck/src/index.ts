import generateConfig from './config.js';
import { parse } from '@babel/parser';
import { getExtNameFromFilePath } from './libs/extname.js';
import createVisitor, { PluckedContent } from './visitor.js';
import traversePkg from '@babel/traverse';
import { freeText } from './utils.js';
import { Source } from 'graphql';

function getDefault<T>(module: T & { default?: T }): T {
  return module.default || module;
}

const traverse = getDefault(traversePkg);

/**
 * Additional options for determining how a file is parsed.
 */
export interface GraphQLTagPluckOptions {
  /**
   * Additional options for determining how a file is parsed.An array of packages that are responsible for exporting the GraphQL string parser function. The following modules are supported by default:
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
}

const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.flow', '.flow.js', '.flow.jsx', '.vue', '.svelte'];

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
  blockType: string
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

/**
 * Asynchronously plucks GraphQL template literals from a single file.
 *
 * Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`, `.svelte`
 *
 * @param filePath Path to the file containing the code. Required to detect the file type
 * @param code The contents of the file being parsed.
 * @param options Additional options for determining how a file is parsed.
 */
export const gqlPluckFromCodeString = async (
  filePath: string,
  code: string,
  options: GraphQLTagPluckOptions = {}
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
  }

  const sources = parseCode({ code, filePath, options }).map(t => new Source(t.content, filePath, t.loc.start));
  if (blockSource) {
    sources.push(blockSource);
  }
  return sources;
};

/**
 * Synchronously plucks GraphQL template literals from a single file
 *
 * Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`, `.svelte`
 *
 * @param filePath Path to the file containing the code. Required to detect the file type
 * @param code The contents of the file being parsed.
 * @param options Additional options for determining how a file is parsed.
 */
export const gqlPluckFromCodeStringSync = (
  filePath: string,
  code: string,
  options: GraphQLTagPluckOptions = {}
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
  }

  const sources = parseCode({ code, filePath, options }).map(t => new Source(t.content, filePath, t.loc.start));
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
  `)
);

const MissingSvelteTemplateCompilerError = new Error(
  freeText(`
    GraphQL template literals cannot be plucked from a Svelte template code without having the "svelte2tsx" & "svelte" package installed.
    Please install it and try again.

    Via NPM:

        $ npm install svelte2tsx svelte

    Via Yarn:

        $ yarn add svelte2tsx svelte
  `)
);

async function loadVueCompilerSync() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    return await import('@vue/compiler-sfc');
  } catch (e: any) {
    throw MissingVueTemplateCompilerError;
  }
}

function loadVueCompilerAsync() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    return require('@vue/compiler-sfc');
  } catch (e: any) {
    throw MissingVueTemplateCompilerError;
  }
}

async function pluckVueFileScript(fileData: string) {
  const vueTemplateCompiler = await loadVueCompilerSync();
  return parseWithVue(vueTemplateCompiler, fileData);
}

function pluckVueFileScriptSync(fileData: string) {
  const vueTemplateCompiler = loadVueCompilerAsync();
  return parseWithVue(vueTemplateCompiler, fileData);
}

async function pluckVueFileCustomBlock(fileData: string, filePath: string, blockType: string) {
  const vueTemplateCompiler = await loadVueCompilerSync();
  return customBlockFromVue(vueTemplateCompiler, fileData, filePath, blockType);
}

function pluckVueFileCustomBlockSync(fileData: string, filePath: string, blockType: string) {
  const vueTemplateCompiler = loadVueCompilerAsync();
  return customBlockFromVue(vueTemplateCompiler, fileData, filePath, blockType);
}

async function pluckSvelteFileScript(fileData: string) {
  let svelte2tsx: typeof import('svelte2tsx');
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    svelte2tsx = await import('svelte2tsx');
  } catch (e: any) {
    throw MissingSvelteTemplateCompilerError;
  }

  return parseWithSvelte(svelte2tsx, fileData);
}

function pluckSvelteFileScriptSync(fileData: string) {
  let svelte2tsx: typeof import('svelte2tsx');

  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    svelte2tsx = require('svelte2tsx');
  } catch (e: any) {
    throw MissingSvelteTemplateCompilerError;
  }

  return parseWithSvelte(svelte2tsx, fileData);
}
