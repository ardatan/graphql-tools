import {
  coerceInputValue as coerceInputValueBase,
  versionInfo,
  type GraphQLError,
  type GraphQLInputType,
} from 'graphql';

type ValidateInputValueFn = (
  inputValue: unknown,
  type: GraphQLInputType,
  onError: (error: GraphQLError, path: ReadonlyArray<string | number>) => void,
) => void;

// `validateInputValue` was introduced in graphql@17 — access via require to avoid a static import
// that fails type-checking on v16.
const validateInputValue: ValidateInputValueFn | undefined =
  versionInfo.major >= 17
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('graphql') as { validateInputValue: ValidateInputValueFn }).validateInputValue
    : undefined;

/**
 * `coerceInputValue` is a shim of the function of the same name in `graphql`
 *
 * - In graphql@16, `coerceInputValue` takes an `onError` callback as its 3rd param
 * - In grpahql@17, `coerceInputValue` just does the coercion,
 *   the `onError` callback is done using `validateInputValue` (does not exist in graphql@16)
 * - This shim allows us to keep the input and output as-is
 */
export const coerceInputValue = (
  value: unknown,
  varType: GraphQLInputType,
  onError?: (
    path: ReadonlyArray<string | number>,
    invalidValue: unknown,
    error: GraphQLError,
  ) => void,
): unknown => {
  if (validateInputValue) {
    validateInputValue(value, varType, (error, path) => {
      onError?.(path, value, error);
    });
    return (coerceInputValueBase as any)(value, varType);
  }

  return (coerceInputValueBase as any)(value, varType, onError);
};
