import os from 'os';
import { isExecutableDefinitionNode, Kind } from 'graphql';
import { uniqueCode } from '@graphql-tools/webpack-loader-runtime';
import { parseDocument } from './parser';
import { optimizeDocumentNode, removeDescriptions, removeEmptyNodes } from '@graphql-tools/optimize';
function isSDL(doc) {
    return !doc.definitions.some(function (def) { return isExecutableDefinitionNode(def); });
}
function expandImports(source, options) {
    var lines = source.split(/\r\n|\r|\n/);
    var outputCode = options.importHelpers
        ? "\n    var useUnique = require('@graphql-tools/webpack-loader-runtime').useUnique;\n    var unique = useUnique();\n  "
        : "\n    " + uniqueCode + "\n  ";
    lines.some(function (line) {
        if (line[0] === '#' && line.slice(1).split(' ')[0] === 'import') {
            var importFile = line.slice(1).split(' ')[1];
            var parseDocument_1 = "require(" + importFile + ")";
            var appendDef = "doc.definitions = doc.definitions.concat(unique(" + parseDocument_1 + ".definitions));";
            outputCode += appendDef + os.EOL;
        }
        return line.length !== 0 && line[0] !== '#';
    });
    return outputCode;
}
export default function graphqlLoader(source) {
    this.cacheable();
    // TODO: This should probably use this.getOptions()
    var options = this.query || {};
    var doc = parseDocument(source);
    var optimizers = [];
    if (options.noDescription) {
        optimizers.push(removeDescriptions);
    }
    if (options.noEmptyNodes) {
        optimizers.push(removeEmptyNodes);
    }
    if (optimizers.length > 0 && isSDL(doc)) {
        doc = optimizeDocumentNode(doc, optimizers);
    }
    var stringifiedDoc = JSON.stringify(doc);
    if (options.replaceKinds) {
        for (var identifier in Kind) {
            var value = Kind[identifier];
            stringifiedDoc = stringifiedDoc.replace(new RegExp("\"kind\":\"" + value + "\"", 'g'), "\"kind\": Kind." + identifier);
        }
    }
    var headerCode = "\n    " + (options.replaceKinds ? "var Kind = require('graphql/language/kinds');" : '') + "\n    var doc = " + stringifiedDoc + ";\n  ";
    var outputCode = '';
    // Allow multiple query/mutation definitions in a file. This parses out dependencies
    // at compile time, and then uses those at load time to create minimal query documents
    // We cannot do the latter at compile time due to how the #import code works.
    var operationCount = doc.definitions.reduce(function (accum, op) {
        if (op.kind === Kind.OPERATION_DEFINITION) {
            return accum + 1;
        }
        return accum;
    }, 0);
    function exportDefaultStatement(identifier) {
        if (options.esModule) {
            return "export default " + identifier;
        }
        return "module.exports = " + identifier;
    }
    if (operationCount > 1) {
        throw new Error('GraphQL Webpack Loader allows only for one GraphQL Operation per file');
    }
    outputCode += "\n    " + exportDefaultStatement('doc') + "\n  ";
    var importOutputCode = expandImports(source, options);
    var allCode = [headerCode, importOutputCode, outputCode, ''].join(os.EOL);
    return allCode;
}
