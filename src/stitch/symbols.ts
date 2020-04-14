const hasSymbol =
  (typeof global !== 'undefined' && 'Symbol' in global) ||
  // eslint-disable-next-line no-undef
  (typeof window !== 'undefined' && 'Symbol' in window);

export const OBJECT_SUBSCHEMA_SYMBOL = hasSymbol
  ? Symbol('initialSubschema')
  : '@@__initialSubschema';
export const FIELD_SUBSCHEMA_MAP_SYMBOL = hasSymbol
  ? Symbol('subschemaMap')
  : '@@__subschemaMap';
export const ERROR_SYMBOL = hasSymbol
  ? Symbol('subschemaErrors')
  : '@@__subschemaErrors';
