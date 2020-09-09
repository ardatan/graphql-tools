import { mergeDeep, ERROR_SYMBOL } from '@graphql-tools/utils';

import { SubschemaConfig } from '../types';
import { OBJECT_SUBSCHEMA_SYMBOL, FIELD_SUBSCHEMA_MAP_SYMBOL } from '../symbols';

export function mergeProxiedResults(target: any, ...sources: Array<any>): any {
  const results: Array<any> = [];
  const errors: Array<Error> = [];

  sources.forEach(source => {
    if (source instanceof Error) {
      errors.push(source);
    } else {
      results.push(source);
      errors.push(source[ERROR_SYMBOL]);
    }
  });

  const fieldSubschemaMap = results.reduce((acc: Record<any, SubschemaConfig>, source: any) => {
    const subschema = source[OBJECT_SUBSCHEMA_SYMBOL];
    Object.keys(source).forEach(key => {
      acc[key] = subschema;
    });
    return acc;
  }, {});

  const result = results.reduce(mergeDeep, target);
  result[FIELD_SUBSCHEMA_MAP_SYMBOL] = target[FIELD_SUBSCHEMA_MAP_SYMBOL]
    ? Object.assign({}, target[FIELD_SUBSCHEMA_MAP_SYMBOL], fieldSubschemaMap)
    : fieldSubschemaMap;

  result[ERROR_SYMBOL] = target[ERROR_SYMBOL].concat(...errors);

  return result;
}
