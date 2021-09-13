import { __read, __values } from "tslib";
import { collectSubFields } from '@graphql-tools/utils';
export function getFieldsNotInSubschema(schema, stitchingInfo, gatewayType, subschemaType, fieldNodes, fragments, variableValues) {
    var e_1, _a, e_2, _b, e_3, _c;
    var _d;
    var subFieldNodesByResponseKey = collectSubFields(schema, fragments, variableValues, gatewayType, fieldNodes);
    // TODO: Verify whether it is safe that extensions always exists.
    var fieldNodesByField = stitchingInfo === null || stitchingInfo === void 0 ? void 0 : stitchingInfo.fieldNodesByField;
    var fields = subschemaType.getFields();
    var fieldsNotInSchema = new Set();
    try {
        for (var subFieldNodesByResponseKey_1 = __values(subFieldNodesByResponseKey), subFieldNodesByResponseKey_1_1 = subFieldNodesByResponseKey_1.next(); !subFieldNodesByResponseKey_1_1.done; subFieldNodesByResponseKey_1_1 = subFieldNodesByResponseKey_1.next()) {
            var _e = __read(subFieldNodesByResponseKey_1_1.value, 2), subFieldNodes = _e[1];
            var fieldName = subFieldNodes[0].name.value;
            if (!fields[fieldName]) {
                try {
                    for (var subFieldNodes_1 = (e_2 = void 0, __values(subFieldNodes)), subFieldNodes_1_1 = subFieldNodes_1.next(); !subFieldNodes_1_1.done; subFieldNodes_1_1 = subFieldNodes_1.next()) {
                        var subFieldNode = subFieldNodes_1_1.value;
                        fieldsNotInSchema.add(subFieldNode);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (subFieldNodes_1_1 && !subFieldNodes_1_1.done && (_b = subFieldNodes_1.return)) _b.call(subFieldNodes_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            var fieldNodesForField = (_d = fieldNodesByField === null || fieldNodesByField === void 0 ? void 0 : fieldNodesByField[gatewayType.name]) === null || _d === void 0 ? void 0 : _d[fieldName];
            if (fieldNodesForField) {
                try {
                    for (var fieldNodesForField_1 = (e_3 = void 0, __values(fieldNodesForField)), fieldNodesForField_1_1 = fieldNodesForField_1.next(); !fieldNodesForField_1_1.done; fieldNodesForField_1_1 = fieldNodesForField_1.next()) {
                        var fieldNode = fieldNodesForField_1_1.value;
                        if (!fields[fieldNode.name.value]) {
                            fieldsNotInSchema.add(fieldNode);
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (fieldNodesForField_1_1 && !fieldNodesForField_1_1.done && (_c = fieldNodesForField_1.return)) _c.call(fieldNodesForField_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (subFieldNodesByResponseKey_1_1 && !subFieldNodesByResponseKey_1_1.done && (_a = subFieldNodesByResponseKey_1.return)) _a.call(subFieldNodesByResponseKey_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return Array.from(fieldsNotInSchema);
}
