import { Transform, Request } from '../Interfaces';

import {
  visit,
  Kind,
  SelectionSetNode,
  BREAK,
  FieldNode,
} from 'graphql';

export default class ExtractField implements Transform {
  private readonly from: Array<string>;
  private readonly to: Array<string>;

  constructor({ from, to }: { from: Array<string>; to: Array<string> }) {
    this.from = from;
    this.to = to;
  }

  public transformRequest(originalRequest: Request): Request {
    let fromSelection: SelectionSetNode | undefined;
    const ourPathFrom = JSON.stringify(this.from);
    const ourPathTo = JSON.stringify(this.to);
    let fieldPath: Array<string> = [];
    visit(originalRequest.document, {
      [Kind.FIELD]: {
        enter: (node: FieldNode) => {
          fieldPath.push(node.name.value);
          if (ourPathFrom === JSON.stringify(fieldPath)) {
            fromSelection = node.selectionSet;
            return BREAK;
          }
        },
        leave: () => {
          fieldPath.pop();
        },
      },
    });

    fieldPath = [];
    const newDocument = visit(originalRequest.document, {
      [Kind.FIELD]: {
        enter: (node: FieldNode) => {
          fieldPath.push(node.name.value);
          if (ourPathTo === JSON.stringify(fieldPath) && fromSelection != null) {
            return {
              ...node,
              selectionSet: fromSelection,
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
}
