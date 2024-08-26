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
  if (data instanceof Error) {
    return null;
  }
  if (Array.isArray(data)) {
    return data.map(entry => projectDataSelectionSet(entry, selectionSet));
  }
  const projectedData: Record<string, any> = {
    __typename: data.__typename,
  };
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const fieldName = selection.name.value;
      const responseKey = selection.alias?.value || selection.name.value;
      if (Object.prototype.hasOwnProperty.call(data, responseKey)) {
        const projectedKeyData = projectDataSelectionSet(data[responseKey], selection.selectionSet);
        if (projectedData[fieldName]) {
          if (projectedKeyData != null && !(projectedKeyData instanceof Error)) {
            projectedData[fieldName] = mergeDeep(
              [projectedData[fieldName], projectedKeyData],
              undefined,
              true,
              true,
            );
          }
        } else {
          projectedData[fieldName] = projectedKeyData;
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
        mergeDeep(
          [projectedData, projectDataSelectionSet(data, selection.selectionSet)],
          undefined,
          true,
          true,
        ),
      );
    }
  }
  return projectedData;
}

export function getKeyFnForFederation(typeName: string, keys: string[]) {
  if (keys.some(key => key.includes('{') || key.includes('('))) {
    const parsedSelectionSet = parseSelectionSet(`{${keys.join(' ')}}`, { noLocation: true });
    return function keyFn(root: any) {
      return projectDataSelectionSet(
        {
          __typename: typeName,
          ...root,
        },
        parsedSelectionSet,
      );
    };
  }
  const allKeyProps = keys.flatMap(key => key.split(' ')).map(key => key.trim());
  if (allKeyProps.length > 1) {
    return function keyFn(root: any) {
      return allKeyProps.reduce(
        (prev, key) => {
          if (key !== '__typename') {
            prev[key] = root[key];
          }
          return prev;
        },
        { __typename: typeName },
      );
    };
  }
  const keyProp = allKeyProps[0];
  return function keyFn(root: any) {
    return {
      __typename: typeName,
      [keyProp]: root[keyProp],
    };
  };
}

export function getCacheKeyFnFromKey(key: string) {
  if (key.includes('{') || key.includes('(')) {
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

const internalTypeNames = ['_Entity', '_Any', '_FieldSet', '_Service', 'link', 'inaccessible'];

export function filterInternalFieldsAndTypes(finalSchema: GraphQLSchema) {
  return mapSchema(finalSchema, {
    [MapperKind.DIRECTIVE]: directive => {
      if (
        internalTypeNames.includes(directive.name) ||
        directive.name.startsWith('link__') ||
        directive.name.startsWith('join__') ||
        directive.name.startsWith('core__')
      ) {
        return null;
      }
      return directive;
    },
    [MapperKind.TYPE]: type => {
      if (
        internalTypeNames.includes(type.name) ||
        type.name.startsWith('link__') ||
        type.name.startsWith('join__') ||
        type.name.startsWith('core__') ||
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

type EventMap<T> = Record<keyof T, any[]>;

export class EventEmitter<T extends EventMap<T>> {
  #listeners: Map<keyof T, Array<(...args: any[]) => void>> = new Map();

  on<K extends keyof T>(eventName: K, listener: (...args: T[K]) => void): this {
    const listeners = this.#listeners.get(eventName);
    if (!listeners) {
      this.#listeners.set(eventName, [listener]);
    } else {
      listeners.push(listener);
    }
    return this;
  }

  once<K extends keyof T>(eventName: K, listener: (...args: T[K]) => void): this {
    const selfRemovingListener = (...args: T[K]) => {
      this.off(eventName, selfRemovingListener);
      listener(...args);
    };
    this.on(eventName, selfRemovingListener);
    return this;
  }

  off<K extends keyof T>(eventName: K, listener: (...args: T[K]) => void): this {
    const listeners = this.#listeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(listener);
      listeners.splice(index, 1);
    }
    return this;
  }

  emit<K extends keyof T>(eventName: K, ...args: T[K]): boolean {
    const listeners = this.#listeners.get(eventName);
    if (!listeners) {
      return false;
    }
    for (let i = listeners.length - 1; i >= 0; i--) {
      listeners[i](...args);
    }
    return true;
  }
}
