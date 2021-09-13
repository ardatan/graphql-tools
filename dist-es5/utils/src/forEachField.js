import { getNamedType, isObjectType } from 'graphql';
export function forEachField(schema, fn) {
    var typeMap = schema.getTypeMap();
    for (var typeName in typeMap) {
        var type = typeMap[typeName];
        // TODO: maybe have an option to include these?
        if (!getNamedType(type).name.startsWith('__') && isObjectType(type)) {
            var fields = type.getFields();
            for (var fieldName in fields) {
                var field = fields[fieldName];
                fn(field, typeName, fieldName);
            }
        }
    }
}
