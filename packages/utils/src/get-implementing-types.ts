import { GraphQLSchema, isObjectType } from 'graphql';

export function getImplementingTypes(interfaceName: string, schema: GraphQLSchema): string[] {
  const allTypesMap = schema.getTypeMap();
  const result: string[] = [];

  for (const graphqlTypeName in allTypesMap) {
    const graphqlType = allTypesMap[graphqlTypeName];
    if (isObjectType(graphqlType)) {
      const allInterfaces = graphqlType.getInterfaces();

      if (allInterfaces.find(int => int.name === interfaceName)) {
        result.push(graphqlType.name);
      }
    }
  }

  return result;
}
