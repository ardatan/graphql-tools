import { GraphQLSchema } from 'graphql';
import pick from 'lodash.pick';
import { memoize1 } from '@graphql-tools/utils';
import { FilterRootFields, FilterTypes } from '@graphql-tools/wrap';

export function getArgsFromKeysForFederation(representations: readonly any[]) {
  return { representations };
}

export function getKeyForFederation(root: any) {
  return root;
}

export function createKeysFnFromPaths(paths: string[][]) {
  const lodashPaths = paths.map(path => path.join('.'));
  return function keysFn(root: any) {
    return pick(root, lodashPaths);
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
