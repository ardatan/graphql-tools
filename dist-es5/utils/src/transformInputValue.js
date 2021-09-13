import { getNullableType, isLeafType, isListType, isInputObjectType } from 'graphql';
export function transformInputValue(type, value, inputLeafValueTransformer, inputObjectValueTransformer) {
    if (inputLeafValueTransformer === void 0) { inputLeafValueTransformer = null; }
    if (inputObjectValueTransformer === void 0) { inputObjectValueTransformer = null; }
    if (value == null) {
        return value;
    }
    var nullableType = getNullableType(type);
    if (isLeafType(nullableType)) {
        return inputLeafValueTransformer != null ? inputLeafValueTransformer(nullableType, value) : value;
    }
    else if (isListType(nullableType)) {
        return value.map(function (listMember) {
            return transformInputValue(nullableType.ofType, listMember, inputLeafValueTransformer, inputObjectValueTransformer);
        });
    }
    else if (isInputObjectType(nullableType)) {
        var fields = nullableType.getFields();
        var newValue = {};
        for (var key in value) {
            var field = fields[key];
            if (field != null) {
                newValue[key] = transformInputValue(field.type, value[key], inputLeafValueTransformer, inputObjectValueTransformer);
            }
        }
        return inputObjectValueTransformer != null ? inputObjectValueTransformer(nullableType, newValue) : newValue;
    }
    // unreachable, no other possible return value
}
export function serializeInputValue(type, value) {
    return transformInputValue(type, value, function (t, v) { return t.serialize(v); });
}
export function parseInputValue(type, value) {
    return transformInputValue(type, value, function (t, v) { return t.parseValue(v); });
}
export function parseInputValueLiteral(type, value) {
    return transformInputValue(type, value, function (t, v) { return t.parseLiteral(v, {}); });
}
