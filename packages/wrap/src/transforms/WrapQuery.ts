import { FieldNode, visit, Kind, SelectionNode, SelectionSetNode } from 'graphql';

import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '@graphql-tools/delegate';

export type QueryWrapper = (subtree: SelectionSetNode) => SelectionNode | SelectionSetNode;

interface WrapQueryTransformationContext extends Record<string, any> {}

export default class WrapQuery<TContext = Record<string, any>>
  implements Transform<WrapQueryTransformationContext, TContext>
{
  private readonly wrapper: QueryWrapper;
  private readonly extractor: (result: any) => any;
  private readonly path: Array<string>;

  constructor(path: Array<string>, wrapper: QueryWrapper, extractor: (result: any) => any) {
    this.path = path;
    this.wrapper = wrapper;
    this.extractor = extractor;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    _transformationContext: WrapQueryTransformationContext
  ): ExecutionRequest {
    const fieldPath: Array<string> = [];
    const ourPath = JSON.stringify(this.path);
    const document = visit(originalRequest.document, {
      [Kind.FIELD]: {
        enter: (node: FieldNode) => {
          fieldPath.push(node.name.value);
          if (node.selectionSet != null && ourPath === JSON.stringify(fieldPath)) {
            const wrapResult = this.wrapper(node.selectionSet);

            // Selection can be either a single selection or a selection set. If it's just one selection,
            // let's wrap it in a selection set. Otherwise, keep it as is.
            const selectionSet =
              wrapResult != null && wrapResult.kind === Kind.SELECTION_SET
                ? wrapResult
                : {
                    kind: Kind.SELECTION_SET,
                    selections: [wrapResult],
                  };

            return {
              ...node,
              selectionSet,
            };
          }
        },
        leave: () => {
          fieldPath.pop();
        },
      },
    });
    return {
      ...originalRequest,
      document,
    };
  }

  public transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext<TContext>,
    _transformationContext: WrapQueryTransformationContext
  ): ExecutionResult {
    const rootData = originalResult.data;
    if (rootData != null) {
      let data = rootData;
      const path = [...this.path];
      while (path.length > 1) {
        const next = path.shift()!;
        if (data[next]) {
          data = data[next];
        }
      }
      data[path[0]] = this.extractor(data[path[0]]);
    }

    return {
      data: rootData,
      errors: originalResult.errors,
    };
  }
}
