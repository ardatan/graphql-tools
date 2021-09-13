/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable spaced-comment */
/* eslint-disable node/no-deprecated-api */
import { __values } from "tslib";
///<reference path="declarations.d.ts" />
import { loadTypedefsSync } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { concatAST } from 'graphql';
import { isSome } from '@graphql-tools/utils';
var VALID_EXTENSIONS = ['graphql', 'graphqls', 'gql', 'gqls'];
export function handleModule(m, filename) {
    var sources = loadTypedefsSync(filename, {
        loaders: [new GraphQLFileLoader()],
    });
    var documents = sources.map(function (source) { return source.document; }).filter(isSome);
    var mergedDoc = concatAST(documents);
    m.exports = mergedDoc;
}
export function registerGraphQLExtensions(nodeRequire) {
    var e_1, _a;
    try {
        for (var VALID_EXTENSIONS_1 = __values(VALID_EXTENSIONS), VALID_EXTENSIONS_1_1 = VALID_EXTENSIONS_1.next(); !VALID_EXTENSIONS_1_1.done; VALID_EXTENSIONS_1_1 = VALID_EXTENSIONS_1.next()) {
            var ext = VALID_EXTENSIONS_1_1.value;
            nodeRequire.extensions["." + ext] = handleModule;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (VALID_EXTENSIONS_1_1 && !VALID_EXTENSIONS_1_1.done && (_a = VALID_EXTENSIONS_1.return)) _a.call(VALID_EXTENSIONS_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
registerGraphQLExtensions(require);
