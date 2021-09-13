import { __read, __spreadArray, __values } from "tslib";
import { parseValue, valueFromASTUntyped } from 'graphql';
import { extractVariables } from './extractVariables';
import { EXPANSION_PREFIX, KEY_DELIMITER, preparseMergeArgsExpr } from './preparseMergeArgsExpr';
import { propertyTreeFromPaths } from './properties';
import { getSourcePaths } from './getSourcePaths';
export function parseMergeArgsExpr(mergeArgsExpr, selectionSet) {
    var _a = preparseMergeArgsExpr(mergeArgsExpr), newMergeArgsExpr = _a.mergeArgsExpr, expansionExpressions = _a.expansionExpressions;
    var inputValue = parseValue("{ " + newMergeArgsExpr + " }", { noLocation: true });
    var _b = extractVariables(inputValue), newInputValue = _b.inputValue, variablePaths = _b.variablePaths;
    if (!Object.keys(expansionExpressions).length) {
        if (!Object.keys(variablePaths).length) {
            throw new Error('Merge arguments must declare a key.');
        }
        var mappingInstructions = getMappingInstructions(variablePaths);
        var usedProperties_1 = propertyTreeFromPaths(getSourcePaths(mappingInstructions, selectionSet));
        return { args: valueFromASTUntyped(newInputValue), usedProperties: usedProperties_1, mappingInstructions: mappingInstructions };
    }
    var expansionRegEx = new RegExp("^" + EXPANSION_PREFIX + "[0-9]+$");
    for (var variableName in variablePaths) {
        if (!variableName.match(expansionRegEx)) {
            throw new Error('Expansions cannot be mixed with single key declarations.');
        }
    }
    var expansions = [];
    var sourcePaths = [];
    for (var variableName in expansionExpressions) {
        var str = expansionExpressions[variableName];
        var valuePath = variablePaths[variableName];
        var _c = extractVariables(parseValue("" + str, { noLocation: true })), expansionInputValue = _c.inputValue, expansionVariablePaths = _c.variablePaths;
        if (!Object.keys(expansionVariablePaths).length) {
            throw new Error('Merge arguments must declare a key.');
        }
        var mappingInstructions = getMappingInstructions(expansionVariablePaths);
        var value = valueFromASTUntyped(expansionInputValue);
        sourcePaths.push.apply(sourcePaths, __spreadArray([], __read(getSourcePaths(mappingInstructions, selectionSet)), false));
        assertNotWithinList(valuePath);
        expansions.push({
            valuePath: valuePath,
            value: value,
            mappingInstructions: mappingInstructions,
        });
    }
    var usedProperties = propertyTreeFromPaths(sourcePaths);
    return { args: valueFromASTUntyped(newInputValue), usedProperties: usedProperties, expansions: expansions };
}
function getMappingInstructions(variablePaths) {
    var mappingInstructions = [];
    for (var keyPath in variablePaths) {
        var valuePath = variablePaths[keyPath];
        var splitKeyPath = keyPath.split(KEY_DELIMITER).slice(1);
        assertNotWithinList(valuePath);
        mappingInstructions.push({
            destinationPath: valuePath,
            sourcePath: splitKeyPath,
        });
    }
    return mappingInstructions;
}
function assertNotWithinList(path) {
    var e_1, _a;
    try {
        for (var path_1 = __values(path), path_1_1 = path_1.next(); !path_1_1.done; path_1_1 = path_1.next()) {
            var pathSegment = path_1_1.value;
            if (typeof pathSegment === 'number') {
                throw new Error('Insertions cannot be made into a list.');
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (path_1_1 && !path_1_1.done && (_a = path_1.return)) _a.call(path_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
