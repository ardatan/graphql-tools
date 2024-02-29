import { Visitor } from '@babel/traverse';
import {
  isIdentifier,
  isImportDefaultSpecifier,
  isImportSpecifier,
  isTemplateLiteral,
  isTSAsExpression,
  isTSTypeReference,
  isVariableDeclarator,
  TSAsExpression,
} from '@babel/types';
import { asArray } from '@graphql-tools/utils';
import { GraphQLTagPluckOptions } from './index.js';
import { freeText } from './utils.js';

const defaults: GraphQLTagPluckOptions = {
  modules: [
    {
      name: 'graphql-tag',
    },
    {
      name: 'graphql-tag.macro',
    },
    {
      name: '@apollo/client',
      identifier: 'gql',
    },
    {
      name: '@apollo/client/core',
      identifier: 'gql',
    },
    {
      name: 'apollo-angular',
      identifier: 'gql',
    },
    {
      name: 'gatsby',
      identifier: 'graphql',
    },
    {
      name: 'apollo-server-express',
      identifier: 'gql',
    },
    {
      name: 'apollo-server',
      identifier: 'gql',
    },
    {
      name: 'react-relay',
      identifier: 'graphql',
    },
    {
      name: 'react-relay/hooks',
      identifier: 'graphql',
    },
    {
      name: 'relay-runtime',
      identifier: 'graphql',
    },
    {
      name: 'babel-plugin-relay/macro',
      identifier: 'graphql',
    },
    {
      name: 'apollo-boost',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-koa',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-hapi',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-fastify',
      identifier: 'gql',
    },
    {
      name: ' apollo-server-lambda',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-micro',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-azure-functions',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-cloud-functions',
      identifier: 'gql',
    },
    {
      name: 'apollo-server-cloudflare',
      identifier: 'gql',
    },
    {
      name: 'graphql.macro',
      identifier: 'gql',
    },
    {
      name: '@urql/core',
      identifier: 'gql',
    },
    {
      name: 'urql',
      identifier: 'gql',
    },
    {
      name: '@urql/preact',
      identifier: 'gql',
    },
    {
      name: '@urql/svelte',
      identifier: 'gql',
    },
    {
      name: '@urql/vue',
      identifier: 'gql',
    },
  ],
  gqlMagicComment: 'graphql',
  globalGqlIdentifierName: ['gql', 'graphql'],
};

export type PluckedContent = {
  content: string;
  start: number;
  end: number;
  loc: {
    start: {
      line: number;
      column: number;
    };
    end: {
      line: number;
      column: number;
    };
  };
};

function defaultPluckStringFromFile(
  code: string,
  { start, end }: { start: number; end: number },
  options: { skipIndent?: boolean } = {},
) {
  return freeText(
    code
      // Slice quotes
      .slice(start + 1, end - 1)
      // Erase string interpolations as we gonna export everything as a single
      // string anyway
      .replace(/\$\{[^}]*\}/g, '')
      .split('\\`')
      .join('`'),
    options.skipIndent,
  );
}

function defaultIsGqlTemplateLiteral(node: any, options: { gqlMagicComment?: string }) {
  const leadingComments = node.leadingComments;

  if (!leadingComments) {
    return;
  }
  if (!leadingComments.length) {
    return;
  }

  const leadingComment = leadingComments[leadingComments.length - 1];
  const leadingCommentValue = leadingComment.value.trim().toLowerCase();

  if (leadingCommentValue === options.gqlMagicComment) {
    return true;
  }

  return false;
}

export default (code: string, out: any, options: GraphQLTagPluckOptions = {}) => {
  // Apply defaults to options
  let {
    modules = [],
    globalGqlIdentifierName,
    gqlMagicComment,
    skipIndent,
    isGqlTemplateLiteral = defaultIsGqlTemplateLiteral,
    pluckStringFromFile = defaultPluckStringFromFile,
  } = {
    ...defaults,
    ...options,
  };

  // Prevent case related potential errors
  gqlMagicComment = gqlMagicComment!.toLowerCase();
  // normalize `name` and `identifier` values
  modules = modules.map(mod => {
    return {
      name: mod.name,
      identifier: mod.identifier && mod.identifier.toLowerCase(),
    };
  });
  globalGqlIdentifierName = asArray(globalGqlIdentifierName ?? '');

  const hooksOptions = { skipIndent, gqlMagicComment, modules, globalGqlIdentifierName };

  // Keep imported identifiers
  // import gql from 'graphql-tag' -> gql
  // import { graphql } from 'gatsby' -> graphql
  // Will result with ['gql', 'graphql']
  const definedIdentifierNames: string[] = [];

  const alreadyProcessedOperationsCache = new Set<string>();
  // Will accumulate all template literals
  const gqlTemplateLiterals: PluckedContent[] = [];

  // Check if package is registered
  function isValidPackage(name: string) {
    return modules!.some(pkg => pkg.name && name && pkg.name.toLowerCase() === name.toLowerCase());
  }

  // Check if identifier is defined and imported from registered packages
  function isValidIdentifier(name: string) {
    return (
      definedIdentifierNames.some(id => id === name) || globalGqlIdentifierName!.includes(name)
    );
  }

  const addTemplateLiteralToResult = (content: PluckedContent) => {
    const cacheKey = `end/${content.end}/start/${content.start}/${content.content}`;
    if (alreadyProcessedOperationsCache.has(cacheKey)) {
      return;
    }
    alreadyProcessedOperationsCache.add(cacheKey);
    gqlTemplateLiterals.push(content);
  };

  // Push all template literals leaded by graphql magic comment
  // e.g. /* GraphQL */ `query myQuery {}` -> query myQuery {}
  const pluckMagicTemplateLiteral = (node: any, takeExpression = false) => {
    if (!isGqlTemplateLiteral(node, hooksOptions)) {
      return;
    }

    const nodeToUse = takeExpression ? node.expression : node;
    const gqlTemplateLiteral = pluckStringFromFile(code, nodeToUse, hooksOptions);
    if (gqlTemplateLiteral) {
      addTemplateLiteralToResult({
        content: gqlTemplateLiteral,
        loc: node.loc,
        end: node.end,
        start: node.start,
      });
    }
  };

  const visitor: Visitor = {
    CallExpression: {
      enter(path) {
        // Find the identifier name used from graphql-tag, commonJS
        // e.g. import gql from 'graphql-tag' -> gql
        const arg0 = path.node.arguments[0];

        if (
          'name' in path.node.callee &&
          path.node.callee.name === 'require' &&
          'value' in arg0 &&
          typeof arg0.value === 'string' &&
          isValidPackage(arg0.value)
        ) {
          if (!isVariableDeclarator(path.parent)) {
            return;
          }
          if (!isIdentifier(path.parent.id)) {
            return;
          }

          definedIdentifierNames.push(path.parent.id.name);

          return;
        }

        // Checks to see if a node represents a typescript '<expression> as const' expression
        function isTSAsConstExpression(node: any): node is TSAsExpression {
          return (
            isTSAsExpression(node) &&
            isTSTypeReference(node.typeAnnotation) &&
            isIdentifier(node.typeAnnotation.typeName) &&
            node.typeAnnotation.typeName.name === 'const'
          );
        }

        // Extract template literal from as const expression if applicable
        // e.g. gql(`query myQuery {}` as const)
        const unwrappedExpression = isTSAsConstExpression(arg0) ? arg0.expression : arg0;

        // Push strings template literals to gql calls
        // e.g. gql(`query myQuery {}`) -> query myQuery {}
        if (
          isIdentifier(path.node.callee) &&
          isValidIdentifier(path.node.callee.name) &&
          isTemplateLiteral(unwrappedExpression)
        ) {
          const { start, end, loc } = unwrappedExpression;
          if (start != null && end != null && start != null && loc != null) {
            const gqlTemplateLiteral = pluckStringFromFile(
              code,
              unwrappedExpression as any,
              hooksOptions,
            );

            // If the entire template was made out of interpolations it should be an empty
            // string by now and thus should be ignored
            if (gqlTemplateLiteral) {
              addTemplateLiteralToResult({
                content: gqlTemplateLiteral,
                loc,
                end,
                start,
              });
            }
          }
        }
      },
    },

    ImportDeclaration: {
      enter(path) {
        // Find the identifier name used from graphql-tag, es6
        // e.g. import gql from 'graphql-tag' -> gql
        if (!isValidPackage(path.node.source.value)) {
          return;
        }

        const moduleNode = modules.find(
          pkg => pkg.name.toLowerCase() === path.node.source.value.toLowerCase(),
        );

        if (moduleNode == null) {
          return;
        }

        const gqlImportSpecifier = path.node.specifiers.find((importSpecifier: any) => {
          // When it's a default import and registered package has no named identifier
          if (isImportDefaultSpecifier(importSpecifier) && !moduleNode.identifier) {
            return true;
          }

          // When it's a named import that matches registered package's identifier
          if (
            isImportSpecifier(importSpecifier) &&
            'name' in importSpecifier.imported &&
            importSpecifier.imported.name === moduleNode.identifier
          ) {
            return true;
          }

          return false;
        });

        if (!gqlImportSpecifier) {
          return;
        }

        definedIdentifierNames.push(gqlImportSpecifier.local.name);
      },
    },

    ExpressionStatement: {
      exit(path: any) {
        // Push all template literals leaded by graphql magic comment
        // e.g. /* GraphQL */ `query myQuery {}` -> query myQuery {}

        if (!isTemplateLiteral(path.node.expression)) {
          return;
        }

        pluckMagicTemplateLiteral(path.node, true);
      },
    },

    TemplateLiteral: {
      exit(path: any) {
        pluckMagicTemplateLiteral(path.node);
      },
    },

    TaggedTemplateExpression: {
      exit(path: any) {
        // Push all template literals provided to the found identifier name
        // e.g. gql `query myQuery {}` -> query myQuery {}
        if (!isIdentifier(path.node.tag) || !isValidIdentifier(path.node.tag.name)) {
          return;
        }

        const gqlTemplateLiteral = pluckStringFromFile(code, path.node.quasi, hooksOptions);

        if (gqlTemplateLiteral) {
          addTemplateLiteralToResult({
            content: gqlTemplateLiteral,
            end: path.node.quasi.end,
            start: path.node.quasi.start,
            loc: path.node.quasi.loc,
          });
        }
      },
    },

    exit() {
      out.returnValue = gqlTemplateLiterals;
    },
  };

  return visitor;
};
