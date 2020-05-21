import { DocumentNode, IntrospectionQuery } from 'graphql';

export function pick<T>(obj: any, keys: string[]): T {
  for (const key of keys) {
    if (obj[key]) {
      return obj[key];
    }
  }

  return obj;
}

// checkers

export function isSchemaText(obj: any): obj is string {
  return typeof obj === 'string';
}

export function isWrappedSchemaJson(obj: any): obj is { data: IntrospectionQuery } {
  const json = obj as { data: IntrospectionQuery };

  return json.data !== undefined && json.data.__schema !== undefined;
}

export function isSchemaJson(obj: any): obj is IntrospectionQuery {
  const json = obj as IntrospectionQuery;

  return json !== undefined && json.__schema !== undefined;
}

export function isSchemaAst(obj: any): obj is DocumentNode {
  return (obj as DocumentNode).kind !== undefined;
}
