import {
  visit,
  Kind,
  SelectionSetNode,
  FragmentDefinitionNode,
  GraphQLError,
} from 'graphql';

import { Transform, Request, ExecutionResult } from '../../Interfaces';
import { relocatedError } from '../../delegate/errors';

export type QueryTransformer = (
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
) => SelectionSetNode;

export type ResultTransformer = (result: any) => any;

export type ErrorPathTransformer = (
  path: ReadonlyArray<string | number>,
) => Array<string | number>;

export default class TransformQuery implements Transform {
  private readonly path: Array<string>;
  private readonly queryTransformer: QueryTransformer;
  private readonly resultTransformer: ResultTransformer;
  private readonly errorPathTransformer: ErrorPathTransformer;
  private readonly fragments: Record<string, FragmentDefinitionNode>;

  constructor({
    path,
    queryTransformer,
    resultTransformer = (result) => result,
    errorPathTransformer = (errorPath) => [].concat(errorPath),
    fragments = {},
  }: {
    path: Array<string>;
    queryTransformer: QueryTransformer;
    resultTransformer?: ResultTransformer;
    errorPathTransformer?: ErrorPathTransformer;
    fragments?: Record<string, FragmentDefinitionNode>;
  }) {
    this.path = path;
    this.queryTransformer = queryTransformer;
    this.resultTransformer = resultTransformer;
    this.errorPathTransformer = errorPathTransformer;
    this.fragments = fragments;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = originalRequest.document;

    const pathLength = this.path.length;
    let index = 0;
    const newDocument = visit(document, {
      [Kind.FIELD]: {
        enter: (node) => {
          if (index === pathLength || node.name.value !== this.path[index]) {
            return false;
          }

          index++;

          if (index === pathLength) {
            const selectionSet = this.queryTransformer(
              node.selectionSet,
              this.fragments,
            );

            return {
              ...node,
              selectionSet,
            };
          }
        },
        leave: () => {
          index--;
        },
      },
    });
    return {
      ...originalRequest,
      document: newDocument,
    };
  }

  public transformResult(originalResult: ExecutionResult): ExecutionResult {
    const data = this.transformData(originalResult.data);
    const errors = originalResult.errors;
    return {
      data,
      errors: errors != null ? this.transformErrors(errors) : undefined,
    };
  }

  private transformData(data: any): any {
    const leafIndex = this.path.length - 1;
    let index = 0;
    let newData = data;
    if (newData) {
      let next = this.path[index];
      while (index < leafIndex) {
        if (data[next]) {
          newData = newData[next];
        } else {
          break;
        }
        index++;
        next = this.path[index];
      }
      newData[next] = this.resultTransformer(newData[next]);
    }
    return newData;
  }

  private transformErrors(
    errors: ReadonlyArray<GraphQLError>,
  ): ReadonlyArray<GraphQLError> {
    return errors.map((error) => {
      const path: ReadonlyArray<string | number> = error.path;

      let match = true;
      let index = 0;
      while (index < this.path.length) {
        if (path[index] !== this.path[index]) {
          match = false;
          break;
        }
        index++;
      }

      const newPath = match
        ? path
            .slice(0, index)
            .concat(this.errorPathTransformer(path.slice(index)))
        : path;

      return relocatedError(error, newPath);
    });
  }
}
