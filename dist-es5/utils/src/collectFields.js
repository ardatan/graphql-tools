import { __values } from "tslib";
import { memoize5 } from './memoize';
import { Kind, getDirectiveValues, GraphQLSkipDirective, GraphQLIncludeDirective, isAbstractType, typeFromAST, } from 'graphql';
// Taken from GraphQL-JS v16 for backwards compat
export function collectFields(schema, fragments, variableValues, runtimeType, selectionSet, fields, visitedFragmentNames) {
    var e_1, _a;
    try {
        for (var _b = __values(selectionSet.selections), _c = _b.next(); !_c.done; _c = _b.next()) {
            var selection = _c.value;
            switch (selection.kind) {
                case Kind.FIELD: {
                    if (!shouldIncludeNode(variableValues, selection)) {
                        continue;
                    }
                    var name_1 = getFieldEntryKey(selection);
                    var fieldList = fields.get(name_1);
                    if (fieldList !== undefined) {
                        fieldList.push(selection);
                    }
                    else {
                        fields.set(name_1, [selection]);
                    }
                    break;
                }
                case Kind.INLINE_FRAGMENT: {
                    if (!shouldIncludeNode(variableValues, selection) ||
                        !doesFragmentConditionMatch(schema, selection, runtimeType)) {
                        continue;
                    }
                    collectFields(schema, fragments, variableValues, runtimeType, selection.selectionSet, fields, visitedFragmentNames);
                    break;
                }
                case Kind.FRAGMENT_SPREAD: {
                    var fragName = selection.name.value;
                    if (visitedFragmentNames.has(fragName) || !shouldIncludeNode(variableValues, selection)) {
                        continue;
                    }
                    visitedFragmentNames.add(fragName);
                    var fragment = fragments[fragName];
                    if (!fragment || !doesFragmentConditionMatch(schema, fragment, runtimeType)) {
                        continue;
                    }
                    collectFields(schema, fragments, variableValues, runtimeType, fragment.selectionSet, fields, visitedFragmentNames);
                    break;
                }
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
    return fields;
}
/**
 * Determines if a field should be included based on the `@include` and `@skip`
 * directives, where `@skip` has higher precedence than `@include`.
 */
function shouldIncludeNode(variableValues, node) {
    var skip = getDirectiveValues(GraphQLSkipDirective, node, variableValues);
    if ((skip === null || skip === void 0 ? void 0 : skip['if']) === true) {
        return false;
    }
    var include = getDirectiveValues(GraphQLIncludeDirective, node, variableValues);
    if ((include === null || include === void 0 ? void 0 : include['if']) === false) {
        return false;
    }
    return true;
}
/**
 * Determines if a fragment is applicable to the given type.
 */
function doesFragmentConditionMatch(schema, fragment, type) {
    var typeConditionNode = fragment.typeCondition;
    if (!typeConditionNode) {
        return true;
    }
    var conditionalType = typeFromAST(schema, typeConditionNode);
    if (conditionalType === type) {
        return true;
    }
    if (isAbstractType(conditionalType)) {
        var possibleTypes = schema.getPossibleTypes(conditionalType);
        return possibleTypes.includes(type);
    }
    return false;
}
/**
 * Implements the logic to compute the key of a given field's entry
 */
function getFieldEntryKey(node) {
    return node.alias ? node.alias.value : node.name.value;
}
export var collectSubFields = memoize5(function collectSubFields(schema, fragments, variableValues, type, fieldNodes) {
    var e_2, _a;
    var subFieldNodes = new Map();
    var visitedFragmentNames = new Set();
    try {
        for (var fieldNodes_1 = __values(fieldNodes), fieldNodes_1_1 = fieldNodes_1.next(); !fieldNodes_1_1.done; fieldNodes_1_1 = fieldNodes_1.next()) {
            var fieldNode = fieldNodes_1_1.value;
            if (fieldNode.selectionSet) {
                collectFields(schema, fragments, variableValues, type, fieldNode.selectionSet, subFieldNodes, visitedFragmentNames);
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (fieldNodes_1_1 && !fieldNodes_1_1.done && (_a = fieldNodes_1.return)) _a.call(fieldNodes_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return subFieldNodes;
});
