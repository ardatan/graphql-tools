import {
  FieldNode,
  visit,
  Kind,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';

import { Transform, Request, ExecutionResult } from '../../Interfaces';

export type QueryWrapper = (
  subtree: SelectionSetNode,
) => SelectionNode | SelectionSetNode;

export default class WrapQuery implements Transform {
  private readonly wrapper: QueryWrapper;
  private readonly extractor: (result: any) => any;
  private readonly path: Array<string>;

  constructor(
    path: Array<string>,
    wrapper: QueryWrapper,
    extractor: (result: any) => any,
  ) {
    this.path = path;
    this.wrapper = wrapper;
    this.extractor = extractor;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = originalRequest.document;
    const fieldPath: Array<string> = [];
    const ourPath = JSON.stringify(this.path);
    const newDocument = visit(document, {
      [Kind.FIELD]: {
        enter: (node: FieldNode) => {
          fieldPath.push(node.name.value);
          if (ourPath === JSON.stringify(fieldPath)) {
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
      document: newDocument,
    };
  }

  public transformResult(originalResult: ExecutionResult): ExecutionResult {
    const rootData = originalResult.data;
    if (rootData != null) {
      let data = rootData;
      const path = [...this.path];
      while (path.length > 1) {
        const next = path.shift();
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
