import { GraphQLSchema, Kind, SelectionSetNode, TypeNode } from 'graphql';
import { MapperKind, mapSchema, mergeDeep, parseSelectionSet } from '@graphql-tools/utils';

export function getArgsFromKeysForFederation(representations: readonly any[]) {
  return { representations };
}

export function getKeyForFederation<TRoot>(root: TRoot): TRoot {
  return root;
}

export function projectDataSelectionSet(data: any, selectionSet?: SelectionSetNode): any {
  if (data == null || selectionSet == null) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(entry => projectDataSelectionSet(entry, selectionSet));
  }
  const projectedData: Record<string, any> = {
    __typename: data.__typename,
  };
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const key = selection.name.value;
      if (data.hasOwnProperty(key)) {
        const projectedKeyData = projectDataSelectionSet(data[key], selection.selectionSet);
        if (projectedData[key]) {
          projectedData[key] = mergeDeep([projectedData[key], projectedKeyData]);
        } else {
          projectedData[key] = projectDataSelectionSet(data[key], selection.selectionSet);
        }
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      if (
        selection.typeCondition &&
        projectedData['__typename'] != null &&
        projectedData['__typename'] !== selection.typeCondition.name.value
      ) {
        continue;
      }
      Object.assign(
        projectedData,
        mergeDeep([projectedData, projectDataSelectionSet(data, selection.selectionSet)]),
      );
    }
  }
  return projectedData;
}

export function getKeyFnForFederation(typeName: string, keys: string[]) {
  if (keys.some(key => key.includes('{'))) {
    const parsedSelectionSet = parseSelectionSet(`{${keys.join(' ')}}`, { noLocation: true });
    return function keyFn(root: any) {
      root.__typename ||= typeName;
      return projectDataSelectionSet(root, parsedSelectionSet);
    };
  }
  const allKeyProps = keys.flatMap(key => key.split(' ')).map(key => key.trim());
  if (allKeyProps.length > 1) {
    return function keyFn(root: any) {
      return allKeyProps.reduce(
        (prev, key) => {
          prev[key] = root[key];
          return prev;
        },
        { __typename: root['__typename'] || typeName },
      );
    };
  }
  const keyProp = allKeyProps[0];
  return function keyFn(root: any) {
    return {
      __typename: root['__typename'] || typeName,
      [keyProp]: root[keyProp],
    };
  };
}

export function getCacheKeyFnFromKey(key: string) {
  if (key.includes('{')) {
    const parsedSelectionSet = parseSelectionSet(`{${key}}`, { noLocation: true });
    return function cacheKeyFn(root: any) {
      return JSON.stringify(projectDataSelectionSet(root, parsedSelectionSet));
    };
  }
  const keyTrimmed = key.trim();
  const keys = keyTrimmed.split(' ').map(key => key.trim());
  if (keys.length > 1) {
    return function cacheKeyFn(root: any) {
      return keys.map(key => root[key]).join(' ');
    };
  }
  return function cacheKeyFn(root: any) {
    return root[keyTrimmed];
  };
}

const internalTypeNames = ['_Entity', '_Any', '_FieldSet', '_Service'];

export function filterInternalFieldsAndTypes(finalSchema: GraphQLSchema) {
  return mapSchema(finalSchema, {
    [MapperKind.TYPE]: type => {
      if (
        internalTypeNames.includes(type.name) ||
        type.name.startsWith('link__') ||
        type.astNode?.directives?.some(d => d.name.value === 'inaccessible')
      ) {
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
    [MapperKind.ENUM_VALUE]: valueConfig => {
      if (valueConfig.astNode?.directives?.some(d => d.name.value === 'inaccessible')) {
        return null;
      }
    },
    [MapperKind.ARGUMENT]: argConfig => {
      if (argConfig.astNode?.directives?.some(d => d.name.value === 'inaccessible')) {
        return null;
      }
      return argConfig;
    },
  });
}

export function getNamedTypeNode(typeNode: TypeNode) {
  if (typeNode.kind !== Kind.NAMED_TYPE) {
    return getNamedTypeNode(typeNode.type);
  }
  return typeNode;
}
