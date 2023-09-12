import { GraphQLSchema, Kind, TypeNode } from 'graphql';
import { FilterRootFields, FilterTypes } from '@graphql-tools/wrap';

export function getArgsFromKeysForFederation(representations: readonly any[]) {
  return { representations };
}

export function getKeyForFederation<TRoot>(root: TRoot): TRoot {
  return root;
}

export function getCacheKeyFnFromKey(key: string) {
  const keyProps = key.split(' ');
  if (keyProps.length > 1) {
    return function cacheKeyFn(root: any) {
      return keyProps.map(key => root[key]).join(' ');
    };
  }
  return function cacheKeyFn(root: any) {
    return root[key];
  };
}

export function filterInternalFieldsAndTypes(finalSchema: GraphQLSchema) {
  const removeEntitiesField = new FilterRootFields(
    (operation, fieldName) =>
      !(operation === 'Query' && (fieldName === '_entities' || fieldName === '_sdl')),
  );
  const removeEntityAndAny = new FilterTypes(
    type =>
      type.name !== '_Entity' &&
      type.name !== '_Any' &&
      type.name !== '_FieldSet' &&
      type.name !== '_Service' &&
      !type.name.startsWith('link__'),
  );
  const fakeSubschemaConfig = {
    schema: finalSchema,
    transforms: [removeEntitiesField, removeEntityAndAny],
  };
  for (const transform of fakeSubschemaConfig.transforms) {
    finalSchema = transform.transformSchema(finalSchema, fakeSubschemaConfig);
  }
  return finalSchema;
}

export function getNamedTypeNode(typeNode: TypeNode) {
  if (typeNode.kind !== Kind.NAMED_TYPE) {
    return getNamedTypeNode(typeNode.type);
  }
  return typeNode;
}
