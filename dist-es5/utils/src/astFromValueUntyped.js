import { __values } from "tslib";
import { Kind } from 'graphql';
/**
 * Produces a GraphQL Value AST given a JavaScript object.
 * Function will match JavaScript/JSON values to GraphQL AST schema format
 * by using the following mapping.
 *
 * | JSON Value    | GraphQL Value        |
 * | ------------- | -------------------- |
 * | Object        | Input Object         |
 * | Array         | List                 |
 * | Boolean       | Boolean              |
 * | String        | String               |
 * | Number        | Int / Float          |
 * | null          | NullValue            |
 *
 */
export function astFromValueUntyped(value) {
    var e_1, _a;
    // only explicit null, not undefined, NaN
    if (value === null) {
        return { kind: Kind.NULL };
    }
    // undefined
    if (value === undefined) {
        return null;
    }
    // Convert JavaScript array to GraphQL list. If the GraphQLType is a list, but
    // the value is not an array, convert the value using the list's item type.
    if (Array.isArray(value)) {
        var valuesNodes = [];
        try {
            for (var value_1 = __values(value), value_1_1 = value_1.next(); !value_1_1.done; value_1_1 = value_1.next()) {
                var item = value_1_1.value;
                var itemNode = astFromValueUntyped(item);
                if (itemNode != null) {
                    valuesNodes.push(itemNode);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (value_1_1 && !value_1_1.done && (_a = value_1.return)) _a.call(value_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return { kind: Kind.LIST, values: valuesNodes };
    }
    if (typeof value === 'object') {
        var fieldNodes = [];
        for (var fieldName in value) {
            var fieldValue = value[fieldName];
            var ast = astFromValueUntyped(fieldValue);
            if (ast) {
                fieldNodes.push({
                    kind: Kind.OBJECT_FIELD,
                    name: { kind: Kind.NAME, value: fieldName },
                    value: ast,
                });
            }
        }
        return { kind: Kind.OBJECT, fields: fieldNodes };
    }
    // Others serialize based on their corresponding JavaScript scalar types.
    if (typeof value === 'boolean') {
        return { kind: Kind.BOOLEAN, value: value };
    }
    // JavaScript numbers can be Int or Float values.
    if (typeof value === 'number' && isFinite(value)) {
        var stringNum = String(value);
        return integerStringRegExp.test(stringNum)
            ? { kind: Kind.INT, value: stringNum }
            : { kind: Kind.FLOAT, value: stringNum };
    }
    if (typeof value === 'string') {
        return { kind: Kind.STRING, value: value };
    }
    throw new TypeError("Cannot convert value to AST: " + value + ".");
}
/**
 * IntValue:
 *   - NegativeSign? 0
 *   - NegativeSign? NonZeroDigit ( Digit+ )?
 */
var integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
