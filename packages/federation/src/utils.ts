import { GraphQLSchema } from 'graphql';
import pick from 'lodash.pick';
import { FilterRootFields, FilterTypes } from '@graphql-tools/wrap';

export function getArgsFromKeysForFederation(representations: readonly any[]) {
  return { representations };
}

export function createKeyFnForFederation(allKeys: string) {
  const keysAsArr = allKeys.split(' ');
  return function keyFnForFederation(root: any) {
    return pick(root, keysAsArr);
  };
}

export function getKeyForFederation<TRoot>(root: TRoot): TRoot {
  return root;
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
