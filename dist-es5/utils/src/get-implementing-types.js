import { isObjectType } from 'graphql';
export function getImplementingTypes(interfaceName, schema) {
    var allTypesMap = schema.getTypeMap();
    var result = [];
    for (var graphqlTypeName in allTypesMap) {
        var graphqlType = allTypesMap[graphqlTypeName];
        if (isObjectType(graphqlType)) {
            var allInterfaces = graphqlType.getInterfaces();
            if (allInterfaces.find(function (int) { return int.name === interfaceName; })) {
                result.push(graphqlType.name);
            }
        }
    }
    return result;
}
