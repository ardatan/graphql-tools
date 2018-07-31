import {
  FieldNode,
  visit,
  Kind,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';
import { Transform, Request, Result } from '../Interfaces';

export type QueryWrapper = (subtree: SelectionSetNode) => SelectionNode | SelectionSetNode;

export default class WrapQuery implements Transform {
  private wrapper: QueryWrapper;
  private extractor: (result: any) => any;
  private path: Array<string>;

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
            const selectionSet = wrapResult.kind === Kind.SELECTION_SET ? wrapResult : {
                kind: Kind.SELECTION_SET,
                selections: [wrapResult]
              };

            return {
              ...node,
              selectionSet
            };
          }
        },
        leave: (node: FieldNode) => {
          fieldPath.pop();
        },
      },
    });
    return {
      ...originalRequest,
      document: newDocument,
    };
  }

  public transformResult(originalResult: Result): Result {
    let data = originalResult.data;
    if (data) {
      const path = [...this.path];
      while (path.length > 1) {
        const next = path.unshift();
        if (data[next]) {
          data = data[next];
        }
      }
      data[path[0]] = this.extractor(data[path[0]]);
    }

    return {
      data,
      errors: originalResult.errors,
    };
  }
}
