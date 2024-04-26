import { isNullableType, Kind, visit } from 'graphql';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { DelegationContext, Transform } from './types.js';

const OverlappingAliases = Symbol('OverlappingAliases');

interface OverlappingAliasesContext {
  [OverlappingAliases]: boolean;
}

export class OverlappingAliasesTransform<TContext>
  implements Transform<OverlappingAliasesContext, TContext>
{
  transformRequest(
    request: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: OverlappingAliasesContext,
  ) {
    const newDocument = visit(request.document, {
      [Kind.SELECTION_SET]: node => {
        const seenNonNullable = new Set<string>();
        const seenNullable = new Set<string>();
        return {
          ...node,
          selections: node.selections.map(selection => {
            if (selection.kind === Kind.INLINE_FRAGMENT) {
              const selectionTypeName = selection.typeCondition?.name.value;
              if (selectionTypeName) {
                const selectionType =
                  delegationContext.transformedSchema.getType(selectionTypeName);
                if (selectionType && 'getFields' in selectionType) {
                  const selectionTypeFields = selectionType.getFields();
                  return {
                    ...selection,
                    selectionSet: {
                      ...selection.selectionSet,
                      selections: selection.selectionSet.selections.map(subSelection => {
                        if (subSelection.kind === Kind.FIELD) {
                          const fieldName = subSelection.name.value;
                          if (!subSelection.alias) {
                            const field = selectionTypeFields[fieldName];
                            if (field) {
                              let currentNullable: boolean;
                              if (isNullableType(field.type)) {
                                seenNullable.add(fieldName);
                                currentNullable = true;
                              } else {
                                seenNonNullable.add(fieldName);
                                currentNullable = false;
                              }
                              if (seenNullable.has(fieldName) && seenNonNullable.has(fieldName)) {
                                transformationContext[OverlappingAliases] = true;
                                return {
                                  ...subSelection,
                                  alias: {
                                    kind: Kind.NAME,
                                    value: currentNullable
                                      ? `_nullable_${fieldName}`
                                      : `_nonNullable_${fieldName}`,
                                  },
                                };
                              }
                            }
                          }
                        }
                        return subSelection;
                      }),
                    },
                  };
                }
              }
            }
            return selection;
          }),
        };
      },
    });
    return {
      ...request,
      document: newDocument,
    };
  }

  transformResult(
    result: ExecutionResult,
    _delegationContext: DelegationContext<TContext>,
    transformationContext: OverlappingAliasesContext,
  ) {
    if (transformationContext[OverlappingAliases]) {
      return removeOverlappingAliases(result);
    }
    return result;
  }
}

function removeOverlappingAliases(result: any): any {
  if (result != null) {
    if (Array.isArray(result)) {
      return result.map(removeOverlappingAliases);
    } else if (typeof result === 'object') {
      const newResult: Record<string, any> = {};
      for (const key in result) {
        if (key.startsWith('_nullable_') || key.startsWith('_nonNullable_')) {
          const newKey = key.replace(/^_nullable_/, '').replace(/^_nonNullable_/, '');
          newResult[newKey] = removeOverlappingAliases(result[key]);
        } else {
          newResult[key] = removeOverlappingAliases(result[key]);
        }
      }
      return newResult;
    }
  }
  return result;
}
