import { GraphQLSchema, Kind, TypeNode } from 'graphql';
import { MapperKind, mapSchema } from '@graphql-tools/utils';

export function getArgsFromKeysForFederation(representations: readonly any[]) {
  return { representations };
}

export function getKeyForFederation<TRoot>(root: TRoot): TRoot {
  return root;
}

export function getKeyFnForFederation(typeName: string, keys: string[]) {
  const allKeyProps = keys.flatMap(key => key.split(' '));
  if (allKeyProps.length > 1) {
    const typeNameEntry = ['__typename', typeName];
    return function keyFn(root: any) {
      return Object.fromEntries(allKeyProps.map(key => [key, root[key]]).concat([typeNameEntry]));
    };
  }
  const keyProp = allKeyProps[0];
  return function keyFn(root: any) {
    return {
      __typename: root['__typename'],
      [keyProp]: root[keyProp],
    };
  };
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

const internalTypeNames = ['_Entity', '_Any', '_FieldSet', '_Service'];

export function filterInternalFieldsAndTypes(finalSchema: GraphQLSchema) {
  return mapSchema(finalSchema, {
    [MapperKind.TYPE]: type => {
      if (internalTypeNames.includes(type.name) || type.name.startsWith('link__')) {
        return null;
      }
      return type;
    },
    [MapperKind.COMPOSITE_FIELD]: fieldConfig => {
      if (fieldConfig.astNode?.directives?.some(d => d.name.value === 'inaccessible')) {
        return null;
      }
      return fieldConfig;
    },
    [MapperKind.QUERY_ROOT_FIELD]: (fieldConfig, fieldName) => {
      if (fieldName === '_entities') {
        return null;
      }
      return fieldConfig;
    },
  });
}

export function getNamedTypeNode(typeNode: TypeNode) {
  if (typeNode.kind !== Kind.NAMED_TYPE) {
    return getNamedTypeNode(typeNode.type);
  }
  return typeNode;
}
