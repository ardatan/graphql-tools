import {
  GraphQLSchema,
  GraphQLScalarType,
  DocumentNode,
  buildASTSchema,
  isScalarType,
  isInterfaceType,
  isObjectType,
  isEnumType,
  isUnionType,
} from 'graphql';
import { IResolvers } from '@graphql-tools/schema-stitching';
import { extractFieldResolversFromObjectType } from './extract-field-resolvers-from-object-type';

export interface ExtractResolversFromSchemaOptions {
  selectedTypeDefs?: DocumentNode;
}

export function extractResolversFromSchema(
  schema: GraphQLSchema,
  options?: ExtractResolversFromSchemaOptions
): IResolvers {
  let selectedTypeNames: string[];
  const resolvers: IResolvers = {};
  const typeMap = schema.getTypeMap();

  if (options && options.selectedTypeDefs) {
    const invalidSchema = buildASTSchema(options.selectedTypeDefs);
    selectedTypeNames = Object.keys(invalidSchema.getTypeMap());
  }

  for (const typeName in typeMap) {
    if (!typeName.startsWith('__')) {
      const typeDef = typeMap[typeName];

      if (selectedTypeNames && !selectedTypeNames.includes(typeName)) {
        continue;
      }

      if (isScalarType(typeDef)) {
        resolvers[typeName] = typeDef as GraphQLScalarType;
      } else if (isObjectType(typeDef) || isInterfaceType(typeDef)) {
        resolvers[typeName] = extractFieldResolversFromObjectType(typeDef, {
          selectedTypeDefs: options && options.selectedTypeDefs,
        });
      } else if (isEnumType(typeDef)) {
        const enumValues = typeDef.getValues();

        resolvers[typeName] = {};

        for (const { name, value } of enumValues) {
          resolvers[typeName][name] = value;
        }
      } else if (isUnionType(typeDef)) {
        resolvers[typeName] = {
          __resolveType: typeDef.resolveType,
        };
      }
    }
  }
  return resolvers;
}
