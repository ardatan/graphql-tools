import generateConfig from './config';
import { parse } from '@babel/parser';
import { getExtNameFromFilePath } from './libs/extname';
import createVisitor from './visitor';
import traverse from '@babel/traverse';
import { freeText } from './utils';

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
}

const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.flow', '.flow.js', '.flow.jsx', '.vue'];

// tslint:disable-next-line: no-implicit-dependencies
function parseWithVue(vueTemplateCompiler: typeof import('vue-template-compiler'), fileData: string) {
  const parsed = vueTemplateCompiler.parseComponent(fileData);

  return parsed.script ? parsed.script.content : '';
}

/**
 * Asynchronously plucks GraphQL template literals from a single file.
 *
 * Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`
 *
 * @param filePath Path to the file containing the code. Required to detect the file type
 * @param code The contents of the file being parsed.
 * @param options Additional options for determining how a file is parsed.
 */
export const gqlPluckFromCodeString = async (
  filePath: string,
  code: string,
  options: GraphQLTagPluckOptions = {}
): Promise<string> => {
  validate({ code, options });

  const fileExt = extractExtension(filePath);

  if (fileExt === '.vue') {
    code = await pluckVueFileScript(code);
  }

  return parseCode({ code, filePath, options });
};

/**
 * Synchronously plucks GraphQL template literals from a single file
 *
 * Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`
 *
 * @param filePath Path to the file containing the code. Required to detect the file type
 * @param code The contents of the file being parsed.
 * @param options Additional options for determining how a file is parsed.
 */
export const gqlPluckFromCodeStringSync = (
  filePath: string,
  code: string,
  options: GraphQLTagPluckOptions = {}
): string => {
  validate({ code, options });

  const fileExt = extractExtension(filePath);

  if (fileExt === '.vue') {
    code = pluckVueFileScriptSync(code);
  }

  return parseCode({ code, filePath, options });
};

function parseCode({
  code,
  filePath,
  options,
}: {
  code: string;
  filePath: string;
  options: GraphQLTagPluckOptions;
}): any {
  const out: any = { returnValue: null };
  const ast = parse(code, generateConfig(filePath, code, options));
  const visitor = createVisitor(code, out, options);

  traverse(ast as any, visitor);

  return out.returnValue;
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
    GraphQL template literals cannot be plucked from a Vue template code without having the "vue-template-compiler" package installed.
    Please install it and try again.

    Via NPM:

        $ npm install vue-template-compiler

    Via Yarn:

        $ yarn add vue-template-compiler
  `)
);

async function pluckVueFileScript(fileData: string) {
  // tslint:disable-next-line: no-implicit-dependencies
  let vueTemplateCompiler: typeof import('vue-template-compiler');
  try {
    // tslint:disable-next-line: no-implicit-dependencies
    vueTemplateCompiler = await import('vue-template-compiler');
  } catch (e) {
    throw MissingVueTemplateCompilerError;
  }

  return parseWithVue(vueTemplateCompiler, fileData);
}

function pluckVueFileScriptSync(fileData: string) {
  // tslint:disable-next-line: no-implicit-dependencies
  let vueTemplateCompiler: typeof import('vue-template-compiler');

  try {
    // tslint:disable-next-line: no-implicit-dependencies
    vueTemplateCompiler = require('vue-template-compiler');
  } catch (e) {
    throw MissingVueTemplateCompilerError;
  }

  return parseWithVue(vueTemplateCompiler, fileData);
}
