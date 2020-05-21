import generateConfig from './config';
import { parse } from '@babel/parser';
import { getExtNameFromFilePath } from './libs/extname';
import createVisitor from './visitor';
import traverse from '@babel/traverse';
import { freeText } from './utils';

export interface GraphQLTagPluckOptions {
  modules?: Array<{ name: string; identifier?: string }>;
  gqlMagicComment?: string;
  globalGqlIdentifierName?: string | string[];
}

const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.flow', '.flow.js', '.flow.jsx', '.vue'];

// tslint:disable-next-line: no-implicit-dependencies
function parseWithVue(vueTemplateCompiler: typeof import('vue-template-compiler'), fileData: string) {
  const parsed = vueTemplateCompiler.parseComponent(fileData);

  return parsed.script ? parsed.script.content : '';
}

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
      throw TypeError(`Provided file type must be one of ${supportedExtensions.join(', ')}`);
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
