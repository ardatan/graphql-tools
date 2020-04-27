import { freeText } from './utils';
import { GraphQLTagPluckOptions } from '.';
import {
  isVariableDeclarator,
  isIdentifier,
  isTemplateLiteral,
  isImportDefaultSpecifier,
  isImportSpecifier,
} from '@babel/types';
import { asArray } from '@graphql-tools/common';

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
  ],
  gqlMagicComment: 'graphql',
  globalGqlIdentifierName: ['gql', 'graphql'],
};

export default (code: string, out: any, options: GraphQLTagPluckOptions = {}) => {
  // Apply defaults to options
  let { modules, globalGqlIdentifierName, gqlMagicComment } = {
    ...defaults,
    ...options,
  };

  // Prevent case related potential errors
  gqlMagicComment = gqlMagicComment.toLowerCase();
  // normalize `name` and `identifier` values
  modules = modules.map(mod => {
    return {
      name: mod.name,
      identifier: mod.identifier && mod.identifier.toLowerCase(),
    };
  });
  globalGqlIdentifierName = asArray(globalGqlIdentifierName).map(s => s.toLowerCase());

  // Keep imported identifiers
  // import gql from 'graphql-tag' -> gql
  // import { graphql } from 'gatsby' -> graphql
  // Will result with ['gql', 'graphql']
  const definedIdentifierNames: string[] = [];

  // Will accumulate all template literals
  const gqlTemplateLiterals: string[] = [];

  // Check if package is registered
  function isValidPackage(name: string) {
    return modules.some(pkg => pkg.name && name && pkg.name.toLowerCase() === name.toLowerCase());
  }

  // Check if identifier is defined and imported from registered packages
  function isValidIdentifier(name: string) {
    return definedIdentifierNames.some(id => id === name) || globalGqlIdentifierName.includes(name);
  }

  const pluckStringFromFile = ({ start, end }: { start: number; end: number }) => {
    return freeText(
      code
        // Slice quotes
        .slice(start + 1, end - 1)
        // Erase string interpolations as we gonna export everything as a single
        // string anyways
        .replace(/\$\{[^}]*\}/g, '')
        .split('\\`')
        .join('`')
    );
  };

  // Push all template literals leaded by graphql magic comment
  // e.g. /* GraphQL */ `query myQuery {}` -> query myQuery {}
  const pluckMagicTemplateLiteral = (node: any, takeExpression = false) => {
    const leadingComments = node.leadingComments;

    if (!leadingComments) {
      return;
    }
    if (!leadingComments.length) {
      return;
    }

    const leadingComment = leadingComments[leadingComments.length - 1];
    const leadingCommentValue = leadingComment.value.trim().toLowerCase();

    if (leadingCommentValue !== gqlMagicComment) {
      return;
    }

    const gqlTemplateLiteral = pluckStringFromFile(takeExpression ? node.expression : node);

    if (gqlTemplateLiteral) {
      gqlTemplateLiterals.push(gqlTemplateLiteral);
    }
  };

  return {
    CallExpression: {
      enter(path: any) {
        // Find the identifier name used from graphql-tag, commonJS
        // e.g. import gql from 'graphql-tag' -> gql
        if (path.node.callee.name === 'require' && isValidPackage(path.node.arguments[0].value)) {
          if (!isVariableDeclarator(path.parent)) {
            return;
          }
          if (!isIdentifier(path.parent.id)) {
            return;
          }

          definedIdentifierNames.push(path.parent.id.name);

          return;
        }

        const arg0 = path.node.arguments[0];

        // Push strings template literals to gql calls
        // e.g. gql(`query myQuery {}`) -> query myQuery {}
        if (isIdentifier(path.node.callee) && isValidIdentifier(path.node.callee.name) && isTemplateLiteral(arg0)) {
          const gqlTemplateLiteral = pluckStringFromFile(arg0);

          // If the entire template was made out of interpolations it should be an empty
          // string by now and thus should be ignored
          if (gqlTemplateLiteral) {
            gqlTemplateLiterals.push(gqlTemplateLiteral);
          }
        }
      },
    },

    ImportDeclaration: {
      enter(path: any) {
        // Find the identifier name used from graphql-tag, es6
        // e.g. import gql from 'graphql-tag' -> gql
        if (!isValidPackage(path.node.source.value)) {
          return;
        }

        const moduleNode = modules.find(pkg => pkg.name.toLowerCase() === path.node.source.value.toLowerCase());

        const gqlImportSpecifier = path.node.specifiers.find((importSpecifier: any) => {
          // When it's a default import and registered package has no named identifier
          if (isImportDefaultSpecifier(importSpecifier) && !moduleNode.identifier) {
            return true;
          }

          // When it's a named import that matches registered package's identifier
          if (isImportSpecifier(importSpecifier) && importSpecifier.imported.name === moduleNode.identifier) {
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

        const gqlTemplateLiteral = pluckStringFromFile(path.node.quasi);

        if (gqlTemplateLiteral) {
          gqlTemplateLiterals.push(gqlTemplateLiteral);
        }
      },
    },

    exit() {
      out.returnValue = gqlTemplateLiterals.join('\n\n');
    },
  };
};
