import { visit, Kind, SelectionSetNode, FragmentDefinitionNode, GraphQLError } from 'graphql';
import { Transform } from './transforms';
import { Request, Result } from '../Interfaces';

export type QueryTransformer = (
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>
) => SelectionSetNode;

export type ResultTransformer = (result: any) => any;

export type ErrorPathTransformer = (path: ReadonlyArray<string | number>) => Array<string | number>;

export default class TransformQuery implements Transform {
  private path: Array<string>;
  private queryTransformer: QueryTransformer;
  private resultTransformer: ResultTransformer;
  private errorPathTransformer: ErrorPathTransformer;
  private fragments: Record<string, FragmentDefinitionNode>;

  constructor({
    path,
    queryTransformer,
    resultTransformer = result => result,
    errorPathTransformer = errorPath => [].concat(errorPath),
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
        enter: node => {
          if (index === pathLength || node.name.value !== this.path[index]) {
            return false;
          }

          index++;

          if (index === pathLength) {
            const selectionSet = this.queryTransformer(
              node.selectionSet,
              this.fragments
            );

            return {
              ...node,
              selectionSet
            };
          }
        },
        leave: () => {
          index--;
        }
      }
    });
    return {
      ...originalRequest,
      document: newDocument
    };
  }

  public transformResult(originalResult: Result): Result {
    const data = this.transformData(originalResult.data);
    const errors = originalResult.errors;
    return {
      data,
      errors: errors ? this.transformErrors(errors) : undefined
    };
  }

  private transformData(data: any): any {
    let index = 0;
    let leafIndex = this.path.length - 1;
    if (data) {
      let next = this.path[index];
      while (index < leafIndex) {
        if (data[next]) {
          data = data[next];
        } else {
          break;
        }
        index++;
        next = this.path[index];
      }
      data[next] = this.resultTransformer(data[next]);
    }
    return data;
  }

  private transformErrors(errors: ReadonlyArray<GraphQLError>): ReadonlyArray<GraphQLError> {
    return errors.map(error => {
      let path: ReadonlyArray<string | number> = error.path;

      let match = true;
      let index = 0;
      while (index < this.path.length) {
        if (path[index] !== this.path[index]) {
          match = false;
          break;
        }
        index++;
      }

      const newPath = match ?
        path.slice(0, index).concat(this.errorPathTransformer(path.slice(index))) :
        path;

      return new GraphQLError(
        error.message,
        error.nodes,
        error.source,
        error.positions,
        newPath,
        error.originalError,
        error.extensions
      );
    });
  }
}
