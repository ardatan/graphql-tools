import { __assign } from "tslib";
import { freeText } from './utils';
import { isVariableDeclarator, isIdentifier, isTemplateLiteral, isImportDefaultSpecifier, isImportSpecifier, } from '@babel/types';
import { asArray } from '@graphql-tools/utils';
var defaults = {
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
export default (function (code, out, options) {
    if (options === void 0) { options = {}; }
    // Apply defaults to options
    var _a = __assign(__assign({}, defaults), options), _b = _a.modules, modules = _b === void 0 ? [] : _b, globalGqlIdentifierName = _a.globalGqlIdentifierName, gqlMagicComment = _a.gqlMagicComment;
    // Prevent case related potential errors
    gqlMagicComment = gqlMagicComment.toLowerCase();
    // normalize `name` and `identifier` values
    modules = modules.map(function (mod) {
        return {
            name: mod.name,
            identifier: mod.identifier && mod.identifier.toLowerCase(),
        };
    });
    globalGqlIdentifierName = asArray(globalGqlIdentifierName).map(function (s) { return s.toLowerCase(); });
    // Keep imported identifiers
    // import gql from 'graphql-tag' -> gql
    // import { graphql } from 'gatsby' -> graphql
    // Will result with ['gql', 'graphql']
    var definedIdentifierNames = [];
    var alreadyProcessedOperationsCache = new Set();
    // Will accumulate all template literals
    var gqlTemplateLiterals = [];
    // Check if package is registered
    function isValidPackage(name) {
        return modules.some(function (pkg) { return pkg.name && name && pkg.name.toLowerCase() === name.toLowerCase(); });
    }
    // Check if identifier is defined and imported from registered packages
    function isValidIdentifier(name) {
        return definedIdentifierNames.some(function (id) { return id === name; }) || globalGqlIdentifierName.includes(name);
    }
    var pluckStringFromFile = function (_a) {
        var start = _a.start, end = _a.end;
        return freeText(code
            // Slice quotes
            .slice(start + 1, end - 1)
            // Erase string interpolations as we gonna export everything as a single
            // string anyway
            .replace(/\$\{[^}]*\}/g, '')
            .split('\\`')
            .join('`'), options.skipIndent);
    };
    var addTemplateLiteralToResult = function (content) {
        var cacheKey = "end/" + content.end + "/start/" + content.start + "/" + content.content;
        if (alreadyProcessedOperationsCache.has(cacheKey)) {
            return;
        }
        alreadyProcessedOperationsCache.add(cacheKey);
        gqlTemplateLiterals.push(content);
    };
    // Push all template literals leaded by graphql magic comment
    // e.g. /* GraphQL */ `query myQuery {}` -> query myQuery {}
    var pluckMagicTemplateLiteral = function (node, takeExpression) {
        if (takeExpression === void 0) { takeExpression = false; }
        var leadingComments = node.leadingComments;
        if (!leadingComments) {
            return;
        }
        if (!leadingComments.length) {
            return;
        }
        var leadingComment = leadingComments[leadingComments.length - 1];
        var leadingCommentValue = leadingComment.value.trim().toLowerCase();
        if (leadingCommentValue !== gqlMagicComment) {
            return;
        }
        var nodeToUse = takeExpression ? node.expression : node;
        var gqlTemplateLiteral = pluckStringFromFile(nodeToUse);
        if (gqlTemplateLiteral) {
            addTemplateLiteralToResult({
                content: gqlTemplateLiteral,
                loc: node.loc,
                end: node.end,
                start: node.start,
            });
        }
    };
    var visitor = {
        CallExpression: {
            enter: function (path) {
                // Find the identifier name used from graphql-tag, commonJS
                // e.g. import gql from 'graphql-tag' -> gql
                var arg0 = path.node.arguments[0];
                if ('name' in path.node.callee &&
                    path.node.callee.name === 'require' &&
                    'value' in arg0 &&
                    typeof arg0.value === 'string' &&
                    isValidPackage(arg0.value)) {
                    if (!isVariableDeclarator(path.parent)) {
                        return;
                    }
                    if (!isIdentifier(path.parent.id)) {
                        return;
                    }
                    definedIdentifierNames.push(path.parent.id.name);
                    return;
                }
                // Push strings template literals to gql calls
                // e.g. gql(`query myQuery {}`) -> query myQuery {}
                if (isIdentifier(path.node.callee) && isValidIdentifier(path.node.callee.name) && isTemplateLiteral(arg0)) {
                    var start = arg0.start, end = arg0.end, loc = arg0.loc;
                    if (start != null && end != null && start != null && loc != null) {
                        var gqlTemplateLiteral = pluckStringFromFile({ start: start, end: end });
                        // If the entire template was made out of interpolations it should be an empty
                        // string by now and thus should be ignored
                        if (gqlTemplateLiteral) {
                            addTemplateLiteralToResult({
                                content: gqlTemplateLiteral,
                                loc: loc,
                                end: end,
                                start: start,
                            });
                        }
                    }
                }
            },
        },
        ImportDeclaration: {
            enter: function (path) {
                // Find the identifier name used from graphql-tag, es6
                // e.g. import gql from 'graphql-tag' -> gql
                if (!isValidPackage(path.node.source.value)) {
                    return;
                }
                var moduleNode = modules.find(function (pkg) { return pkg.name.toLowerCase() === path.node.source.value.toLowerCase(); });
                if (moduleNode == null) {
                    return;
                }
                var gqlImportSpecifier = path.node.specifiers.find(function (importSpecifier) {
                    // When it's a default import and registered package has no named identifier
                    if (isImportDefaultSpecifier(importSpecifier) && !moduleNode.identifier) {
                        return true;
                    }
                    // When it's a named import that matches registered package's identifier
                    if (isImportSpecifier(importSpecifier) &&
                        'name' in importSpecifier.imported &&
                        importSpecifier.imported.name === moduleNode.identifier) {
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
            exit: function (path) {
                // Push all template literals leaded by graphql magic comment
                // e.g. /* GraphQL */ `query myQuery {}` -> query myQuery {}
                if (!isTemplateLiteral(path.node.expression)) {
                    return;
                }
                pluckMagicTemplateLiteral(path.node, true);
            },
        },
        TemplateLiteral: {
            exit: function (path) {
                pluckMagicTemplateLiteral(path.node);
            },
        },
        TaggedTemplateExpression: {
            exit: function (path) {
                // Push all template literals provided to the found identifier name
                // e.g. gql `query myQuery {}` -> query myQuery {}
                if (!isIdentifier(path.node.tag) || !isValidIdentifier(path.node.tag.name)) {
                    return;
                }
                var gqlTemplateLiteral = pluckStringFromFile(path.node.quasi);
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
        exit: function () {
            out.returnValue = gqlTemplateLiterals;
        },
    };
    return visitor;
});
