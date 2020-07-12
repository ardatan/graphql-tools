import { DocumentNode, IntrospectionQuery } from 'graphql';

/**
 * @internal
 */
export function pick<T>(obj: any, keys: string[]): T {
  for (const key of keys) {
    if (obj[key]) {
      return obj[key];
    }
  }

  return obj;
}

// checkers

/**
 * @internal
 */
export function isSchemaText(obj: any): obj is string {
  return typeof obj === 'string';
}

/**
 * @internal
 */
export function isWrappedSchemaJson(obj: any): obj is { data: IntrospectionQuery } {
  const json = obj as { data: IntrospectionQuery };

  return json.data !== undefined && json.data.__schema !== undefined;
}

/**
 * @internal
 */
export function isSchemaJson(obj: any): obj is IntrospectionQuery {
  const json = obj as IntrospectionQuery;

  return json !== undefined && json.__schema !== undefined;
}

/**
 * @internal
 */
export function isSchemaAst(obj: any): obj is DocumentNode {
  return (obj as DocumentNode).kind !== undefined;
}
