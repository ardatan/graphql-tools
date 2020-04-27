import { GraphQLObjectType, GraphQLInterfaceType, DocumentNode, buildASTSchema } from 'graphql';

export interface IFieldResolvers {
  [fieldName: string]:
    | {
        subscribe: (...args: any[]) => any;
        resolve: (...args: any[]) => any;
      }
    | ((...args: any[]) => any);
}

export interface ExtractFieldResolversFromObjectType {
  selectedTypeDefs?: DocumentNode;
}

export function extractFieldResolversFromObjectType(
  objectType: GraphQLObjectType | GraphQLInterfaceType,
  options?: ExtractFieldResolversFromObjectType
): IFieldResolvers {
  const fieldResolvers: IFieldResolvers = {};
  const fieldMap = objectType.getFields();
  let selectedFieldNames: string[];

  if (options && options.selectedTypeDefs) {
    const invalidSchema = buildASTSchema(options.selectedTypeDefs);
    const typeMap = invalidSchema.getTypeMap();

    if (!(objectType.name in typeMap)) {
      return {};
    }

    const selectedObjectType = typeMap[objectType.name] as GraphQLObjectType | GraphQLInterfaceType;
    selectedFieldNames = Object.keys(selectedObjectType.getFields());
  }

  for (const fieldName in fieldMap) {
    if (selectedFieldNames && !selectedFieldNames.includes(fieldName)) {
      continue;
    }

    const fieldDefinition = fieldMap[fieldName];

    fieldResolvers[fieldName] = {
      subscribe: fieldDefinition.subscribe,
      resolve: fieldDefinition.resolve,
    };
  }

  if ('resolveType' in objectType) {
    fieldResolvers.__resolveType = objectType.resolveType;
  }

  if ('isTypeOf' in objectType) {
    fieldResolvers.__isTypeOf = objectType.isTypeOf;
  }

  return fieldResolvers;
}
