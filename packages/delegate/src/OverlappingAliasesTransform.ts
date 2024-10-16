import { ASTNode, isNullableType, Kind, visit } from 'graphql';
import { ASTVisitorKeyMap, ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
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
    const visitorKeys: ASTVisitorKeyMap = {
      Document: ['definitions'],
      OperationDefinition: ['selectionSet'],
      SelectionSet: ['selections'],
      Field: ['selectionSet'],
      InlineFragment: ['selectionSet'],
      FragmentDefinition: ['selectionSet'],
    };
    const seenNonNullableMap = new WeakMap<readonly ASTNode[], Set<string>>();
    const seenNullableMap = new WeakMap<readonly ASTNode[], Set<string>>();
    const newDocument = visit(
      request.document,
      {
        [Kind.INLINE_FRAGMENT](selection, _key, parent, _path, _ancestors) {
          if (Array.isArray(parent)) {
            const selectionTypeName = selection.typeCondition?.name.value;
            if (selectionTypeName) {
              const selectionType = delegationContext.transformedSchema.getType(selectionTypeName);
              if (selectionType && 'getFields' in selectionType) {
                const selectionTypeFields = selectionType.getFields();
                let seenNonNullable = seenNonNullableMap.get(parent);
                if (!seenNonNullable) {
                  seenNonNullable = new Set();
                  seenNonNullableMap.set(parent, seenNonNullable);
                }
                let seenNullable = seenNullableMap.get(parent);
                if (!seenNullable) {
                  seenNullable = new Set();
                  seenNullableMap.set(parent, seenNullable);
                }
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
        },
      },
      visitorKeys as any,
    );
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
