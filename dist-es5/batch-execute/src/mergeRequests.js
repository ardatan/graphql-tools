// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
import { __assign, __read, __spreadArray, __values } from "tslib";
import { visit, Kind, } from 'graphql';
import { createPrefix } from './prefix';
/**
 * Merge multiple queries into a single query in such a way that query results
 * can be split and transformed as if they were obtained by running original queries.
 *
 * Merging algorithm involves several transformations:
 *  1. Replace top-level fragment spreads with inline fragments (... on Query {})
 *  2. Add unique aliases to all top-level query fields (including those on inline fragments)
 *  3. Prefix all variable definitions and variable usages
 *  4. Prefix names (and spreads) of fragments
 *
 * i.e transform:
 *   [
 *     `query Foo($id: ID!) { foo, bar(id: $id), ...FooQuery }
 *     fragment FooQuery on Query { baz }`,
 *
 *    `query Bar($id: ID!) { foo: baz, bar(id: $id), ... on Query { baz } }`
 *   ]
 * to:
 *   query (
 *     $graphqlTools1_id: ID!
 *     $graphqlTools2_id: ID!
 *   ) {
 *     graphqlTools1_foo: foo,
 *     graphqlTools1_bar: bar(id: $graphqlTools1_id)
 *     ... on Query {
 *       graphqlTools1__baz: baz
 *     }
 *     graphqlTools1__foo: baz
 *     graphqlTools1__bar: bar(id: $graphqlTools1__id)
 *     ... on Query {
 *       graphqlTools1__baz: baz
 *     }
 *   }
 */
export function mergeRequests(requests, extensionsReducer) {
    var e_1, _a;
    var mergedVariables = Object.create(null);
    var mergedVariableDefinitions = [];
    var mergedSelections = [];
    var mergedFragmentDefinitions = [];
    var mergedExtensions = Object.create(null);
    for (var index in requests) {
        var request = requests[index];
        var prefixedRequests = prefixRequest(createPrefix(index), request);
        try {
            for (var _b = (e_1 = void 0, __values(prefixedRequests.document.definitions)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var def = _c.value;
                if (isOperationDefinition(def)) {
                    mergedSelections.push.apply(mergedSelections, __spreadArray([], __read(def.selectionSet.selections), false));
                    if (def.variableDefinitions) {
                        mergedVariableDefinitions.push.apply(mergedVariableDefinitions, __spreadArray([], __read(def.variableDefinitions), false));
                    }
                }
                if (isFragmentDefinition(def)) {
                    mergedFragmentDefinitions.push(def);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        Object.assign(mergedVariables, prefixedRequests.variables);
        mergedExtensions = extensionsReducer(mergedExtensions, request);
    }
    var mergedOperationDefinition = {
        kind: Kind.OPERATION_DEFINITION,
        operation: requests[0].operationType,
        variableDefinitions: mergedVariableDefinitions,
        selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: mergedSelections,
        },
    };
    return {
        document: {
            kind: Kind.DOCUMENT,
            definitions: __spreadArray([mergedOperationDefinition], __read(mergedFragmentDefinitions), false),
        },
        variables: mergedVariables,
        extensions: mergedExtensions,
        context: requests[0].context,
        info: requests[0].info,
        operationType: requests[0].operationType,
    };
}
function prefixRequest(prefix, request) {
    var _a, e_2, _b;
    var _c;
    var executionVariables = (_c = request.variables) !== null && _c !== void 0 ? _c : {};
    function prefixNode(node) {
        return prefixNodeName(node, prefix);
    }
    var prefixedDocument = aliasTopLevelFields(prefix, request.document);
    var executionVariableNames = Object.keys(executionVariables);
    if (executionVariableNames.length > 0) {
        prefixedDocument = visit(prefixedDocument, (_a = {},
            _a[Kind.VARIABLE] = prefixNode,
            _a[Kind.FRAGMENT_DEFINITION] = prefixNode,
            _a[Kind.FRAGMENT_SPREAD] = prefixNode,
            _a));
    }
    var prefixedVariables = {};
    try {
        for (var executionVariableNames_1 = __values(executionVariableNames), executionVariableNames_1_1 = executionVariableNames_1.next(); !executionVariableNames_1_1.done; executionVariableNames_1_1 = executionVariableNames_1.next()) {
            var variableName = executionVariableNames_1_1.value;
            prefixedVariables[prefix + variableName] = executionVariables[variableName];
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (executionVariableNames_1_1 && !executionVariableNames_1_1.done && (_b = executionVariableNames_1.return)) _b.call(executionVariableNames_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return {
        document: prefixedDocument,
        variables: prefixedVariables,
        operationType: request.operationType,
    };
}
/**
 * Adds prefixed aliases to top-level fields of the query.
 *
 * @see aliasFieldsInSelection for implementation details
 */
function aliasTopLevelFields(prefix, document) {
    var _a, _b;
    var transformer = (_a = {},
        _a[Kind.OPERATION_DEFINITION] = function (def) {
            var selections = def.selectionSet.selections;
            return __assign(__assign({}, def), { selectionSet: __assign(__assign({}, def.selectionSet), { selections: aliasFieldsInSelection(prefix, selections, document) }) });
        },
        _a);
    return visit(document, transformer, (_b = {},
        _b[Kind.DOCUMENT] = ["definitions"],
        _b));
}
/**
 * Add aliases to fields of the selection, including top-level fields of inline fragments.
 * Fragment spreads are converted to inline fragments and their top-level fields are also aliased.
 *
 * Note that this method is shallow. It adds aliases only to the top-level fields and doesn't
 * descend to field sub-selections.
 *
 * For example, transforms:
 *   {
 *     foo
 *     ... on Query { foo }
 *     ...FragmentWithBarField
 *   }
 * To:
 *   {
 *     graphqlTools1_foo: foo
 *     ... on Query { graphqlTools1_foo: foo }
 *     ... on Query { graphqlTools1_bar: bar }
 *   }
 */
function aliasFieldsInSelection(prefix, selections, document) {
    return selections.map(function (selection) {
        switch (selection.kind) {
            case Kind.INLINE_FRAGMENT:
                return aliasFieldsInInlineFragment(prefix, selection, document);
            case Kind.FRAGMENT_SPREAD: {
                var inlineFragment = inlineFragmentSpread(selection, document);
                return aliasFieldsInInlineFragment(prefix, inlineFragment, document);
            }
            case Kind.FIELD:
            default:
                return aliasField(selection, prefix);
        }
    });
}
/**
 * Add aliases to top-level fields of the inline fragment.
 * Returns new inline fragment node.
 *
 * For Example, transforms:
 *   ... on Query { foo, ... on Query { bar: foo } }
 * To
 *   ... on Query { graphqlTools1_foo: foo, ... on Query { graphqlTools1_bar: foo } }
 */
function aliasFieldsInInlineFragment(prefix, fragment, document) {
    var selections = fragment.selectionSet.selections;
    return __assign(__assign({}, fragment), { selectionSet: __assign(__assign({}, fragment.selectionSet), { selections: aliasFieldsInSelection(prefix, selections, document) }) });
}
/**
 * Replaces fragment spread with inline fragment
 *
 * Example:
 *   query { ...Spread }
 *   fragment Spread on Query { bar }
 *
 * Transforms to:
 *   query { ... on Query { bar } }
 */
function inlineFragmentSpread(spread, document) {
    var fragment = document.definitions.find(function (def) { return isFragmentDefinition(def) && def.name.value === spread.name.value; });
    if (!fragment) {
        throw new Error("Fragment " + spread.name.value + " does not exist");
    }
    var typeCondition = fragment.typeCondition, selectionSet = fragment.selectionSet;
    return {
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: typeCondition,
        selectionSet: selectionSet,
        directives: spread.directives,
    };
}
function prefixNodeName(namedNode, prefix) {
    return __assign(__assign({}, namedNode), { name: __assign(__assign({}, namedNode.name), { value: prefix + namedNode.name.value }) });
}
/**
 * Returns a new FieldNode with prefixed alias
 *
 * Example. Given prefix === "graphqlTools1_" transforms:
 *   { foo } -> { graphqlTools1_foo: foo }
 *   { foo: bar } -> { graphqlTools1_foo: bar }
 */
function aliasField(field, aliasPrefix) {
    var aliasNode = field.alias ? field.alias : field.name;
    return __assign(__assign({}, field), { alias: __assign(__assign({}, aliasNode), { value: aliasPrefix + aliasNode.value }) });
}
function isOperationDefinition(def) {
    return def.kind === Kind.OPERATION_DEFINITION;
}
function isFragmentDefinition(def) {
    return def.kind === Kind.FRAGMENT_DEFINITION;
}
