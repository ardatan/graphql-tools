import { __assign, __read, __spreadArray } from "tslib";
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { parse, concatAST } from 'graphql';
import { transform as skipRedundantNodesTransform } from 'relay-compiler/lib/transforms/SkipRedundantNodesTransform.js';
import { transform as inlineFragmentsTransform } from 'relay-compiler/lib/transforms/InlineFragmentsTransform.js';
import { transform as applyFragmentArgumentTransform } from 'relay-compiler/lib/transforms/ApplyFragmentArgumentTransform.js';
import { transformWithOptions as flattenTransformWithOptions } from 'relay-compiler/lib/transforms/FlattenTransform.js';
import CompilerContext from 'relay-compiler/lib/core/CompilerContext.js';
import { transform as relayTransform } from 'relay-compiler/lib/core/RelayParser.js';
import { print as relayPrint } from 'relay-compiler/lib/core/IRPrinter.js';
import { create as relayCreate } from 'relay-compiler/lib/core/Schema.js';
export function optimizeDocuments(schema, documents, options) {
    if (options === void 0) { options = {}; }
    options = __assign({ noLocation: true }, options);
    // @TODO way for users to define directives they use, otherwise relay will throw an unknown directive error
    // Maybe we can scan the queries and add them dynamically without users having to do some extra stuff
    // transformASTSchema creates a new schema instance instead of mutating the old one
    var adjustedSchema = relayCreate(printSchemaWithDirectives(schema, options));
    var documentAsts = concatAST(documents);
    var relayDocuments = relayTransform(adjustedSchema, documentAsts.definitions);
    var result = [];
    if (options.includeFragments) {
        var fragmentCompilerContext = new CompilerContext(adjustedSchema)
            .addAll(relayDocuments)
            .applyTransforms([
            applyFragmentArgumentTransform,
            flattenTransformWithOptions({ flattenAbstractTypes: false }),
            skipRedundantNodesTransform,
        ]);
        result.push.apply(result, __spreadArray([], __read(fragmentCompilerContext
            .documents()
            .filter(function (doc) { return doc.kind === 'Fragment'; })
            .map(function (doc) { return parse(relayPrint(adjustedSchema, doc), options); })), false));
    }
    var queryCompilerContext = new CompilerContext(adjustedSchema)
        .addAll(relayDocuments)
        .applyTransforms([
        applyFragmentArgumentTransform,
        inlineFragmentsTransform,
        flattenTransformWithOptions({ flattenAbstractTypes: false }),
        skipRedundantNodesTransform,
    ]);
    result.push.apply(result, __spreadArray([], __read(queryCompilerContext.documents().map(function (doc) { return parse(relayPrint(adjustedSchema, doc), options); })), false));
    return result;
}
