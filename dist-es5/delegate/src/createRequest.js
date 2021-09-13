import { __values } from "tslib";
import { Kind, typeFromAST, } from 'graphql';
import { createVariableNameGenerator, serializeInputValue, updateArgument, } from '@graphql-tools/utils';
export function getDelegatingOperation(parentType, schema) {
    if (parentType === schema.getMutationType()) {
        return 'mutation';
    }
    else if (parentType === schema.getSubscriptionType()) {
        return 'subscription';
    }
    return 'query';
}
export function createRequestFromInfo(_a) {
    var info = _a.info, rootValue = _a.rootValue, operationName = _a.operationName, _b = _a.operation, operation = _b === void 0 ? getDelegatingOperation(info.parentType, info.schema) : _b, _c = _a.fieldName, fieldName = _c === void 0 ? info.fieldName : _c, selectionSet = _a.selectionSet, _d = _a.fieldNodes, fieldNodes = _d === void 0 ? info.fieldNodes : _d, context = _a.context;
    return createRequest({
        sourceSchema: info.schema,
        sourceParentType: info.parentType,
        sourceFieldName: info.fieldName,
        fragments: info.fragments,
        variableDefinitions: info.operation.variableDefinitions,
        variableValues: info.variableValues,
        targetRootValue: rootValue,
        targetOperationName: operationName,
        targetOperation: operation,
        targetFieldName: fieldName,
        selectionSet: selectionSet,
        fieldNodes: fieldNodes,
        context: context,
        info: info,
    });
}
export function createRequest(_a) {
    var e_1, _b, e_2, _c, e_3, _d, e_4, _e;
    var _f, _g;
    var sourceSchema = _a.sourceSchema, sourceParentType = _a.sourceParentType, sourceFieldName = _a.sourceFieldName, fragments = _a.fragments, variableDefinitions = _a.variableDefinitions, variableValues = _a.variableValues, targetRootValue = _a.targetRootValue, targetOperationName = _a.targetOperationName, targetOperation = _a.targetOperation, targetFieldName = _a.targetFieldName, selectionSet = _a.selectionSet, fieldNodes = _a.fieldNodes, context = _a.context, info = _a.info;
    var newSelectionSet;
    var argumentNodeMap = Object.create(null);
    if (selectionSet != null) {
        newSelectionSet = selectionSet;
    }
    else {
        var selections = [];
        try {
            for (var _h = __values(fieldNodes || []), _j = _h.next(); !_j.done; _j = _h.next()) {
                var fieldNode = _j.value;
                if (fieldNode.selectionSet) {
                    try {
                        for (var _k = (e_2 = void 0, __values(fieldNode.selectionSet.selections)), _l = _k.next(); !_l.done; _l = _k.next()) {
                            var selection = _l.value;
                            selections.push(selection);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
            }
            finally { if (e_1) throw e_1.error; }
        }
        newSelectionSet = selections.length
            ? {
                kind: Kind.SELECTION_SET,
                selections: selections,
            }
            : undefined;
        var args = (_f = fieldNodes === null || fieldNodes === void 0 ? void 0 : fieldNodes[0]) === null || _f === void 0 ? void 0 : _f.arguments;
        if (args) {
            try {
                for (var args_1 = __values(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
                    var argNode = args_1_1.value;
                    argumentNodeMap[argNode.name.value] = argNode;
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (args_1_1 && !args_1_1.done && (_d = args_1.return)) _d.call(args_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    }
    var newVariables = Object.create(null);
    var variableDefinitionMap = Object.create(null);
    if (sourceSchema != null && variableDefinitions != null) {
        try {
            for (var variableDefinitions_1 = __values(variableDefinitions), variableDefinitions_1_1 = variableDefinitions_1.next(); !variableDefinitions_1_1.done; variableDefinitions_1_1 = variableDefinitions_1.next()) {
                var def = variableDefinitions_1_1.value;
                var varName = def.variable.name.value;
                variableDefinitionMap[varName] = def;
                var varType = typeFromAST(sourceSchema, def.type);
                var serializedValue = serializeInputValue(varType, variableValues === null || variableValues === void 0 ? void 0 : variableValues[varName]);
                if (serializedValue !== undefined) {
                    newVariables[varName] = serializedValue;
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (variableDefinitions_1_1 && !variableDefinitions_1_1.done && (_e = variableDefinitions_1.return)) _e.call(variableDefinitions_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
    }
    if (sourceParentType != null && sourceFieldName != null) {
        updateArgumentsWithDefaults(sourceParentType, sourceFieldName, argumentNodeMap, variableDefinitionMap, newVariables);
    }
    var rootFieldName = targetFieldName !== null && targetFieldName !== void 0 ? targetFieldName : (_g = fieldNodes === null || fieldNodes === void 0 ? void 0 : fieldNodes[0]) === null || _g === void 0 ? void 0 : _g.name.value;
    if (rootFieldName === undefined) {
        throw new Error("Either \"targetFieldName\" or a non empty \"fieldNodes\" array must be provided.");
    }
    var rootfieldNode = {
        kind: Kind.FIELD,
        arguments: Object.values(argumentNodeMap),
        name: {
            kind: Kind.NAME,
            value: rootFieldName,
        },
        selectionSet: newSelectionSet,
    };
    var operationName = targetOperationName
        ? {
            kind: Kind.NAME,
            value: targetOperationName,
        }
        : undefined;
    var operationDefinition = {
        kind: Kind.OPERATION_DEFINITION,
        name: operationName,
        operation: targetOperation,
        variableDefinitions: Object.values(variableDefinitionMap),
        selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [rootfieldNode],
        },
    };
    var definitions = [operationDefinition];
    if (fragments != null) {
        for (var fragmentName in fragments) {
            var fragment = fragments[fragmentName];
            definitions.push(fragment);
        }
    }
    var document = {
        kind: Kind.DOCUMENT,
        definitions: definitions,
    };
    return {
        document: document,
        variables: newVariables,
        rootValue: targetRootValue,
        operationName: targetOperationName,
        operationType: targetOperation,
        context: context,
        info: info,
    };
}
function updateArgumentsWithDefaults(sourceParentType, sourceFieldName, argumentNodeMap, variableDefinitionMap, variableValues) {
    var e_5, _a;
    var generateVariableName = createVariableNameGenerator(variableDefinitionMap);
    var sourceField = sourceParentType.getFields()[sourceFieldName];
    try {
        for (var _b = __values(sourceField.args), _c = _b.next(); !_c.done; _c = _b.next()) {
            var argument = _c.value;
            var argName = argument.name;
            var sourceArgType = argument.type;
            if (argumentNodeMap[argName] === undefined) {
                var defaultValue = argument.defaultValue;
                if (defaultValue !== undefined) {
                    updateArgument(argumentNodeMap, variableDefinitionMap, variableValues, argName, generateVariableName(argName), sourceArgType, serializeInputValue(sourceArgType, defaultValue));
                }
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_5) throw e_5.error; }
    }
}
