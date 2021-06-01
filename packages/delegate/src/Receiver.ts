import {
  ExecutionResult,
  getNamedType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  isCompositeType,
  isObjectType,
  Kind,
  responsePathAsArray,
  SelectionSetNode,
} from 'graphql';

import DataLoader from 'dataloader';

import { Repeater, Stop } from '@repeaterjs/repeater';

import {
  AsyncExecutionResult,
  collectFields,
  getResponseKeyFromInfo,
  GraphQLExecutionContext,
} from '@graphql-tools/utils';

import { DelegationContext, MergedExecutionResult } from './types';
import { mergeDataAndErrors } from './mergeDataAndErrors';
import { ExpectantStore } from './expectantStore';
import { fieldShouldStream } from './fieldShouldStream';
import { createExternalValue } from './externalValues';

export class Receiver {
  private readonly asyncIterator: AsyncIterator<AsyncExecutionResult>;
  private readonly delegationContext: DelegationContext;
  private readonly fieldName: string;
  private readonly asyncSelectionSets: Record<string, SelectionSetNode>;
  private readonly initialResultDepth: number;
  private cache: ExpectantStore<MergedExecutionResult>;
  private stoppers: Array<Stop>;
  private loaders: Record<string, DataLoader<GraphQLResolveInfo, any>>;

  constructor(asyncIterator: AsyncIterator<AsyncExecutionResult>, delegationContext: DelegationContext) {
    this.asyncIterator = asyncIterator;

    this.delegationContext = delegationContext;
    const { fieldName, info, asyncSelectionSets } = delegationContext;

    this.fieldName = fieldName;
    this.asyncSelectionSets = asyncSelectionSets;

    this.initialResultDepth = info ? responsePathAsArray(info.path).length - 1 : 0;

    this.cache = new ExpectantStore();
    this.stoppers = [];
    this.loaders = Object.create(null);
  }

  public async getInitialValue(): Promise<any> {
    const { subschema, fieldName, context, info, returnType, onLocatedError } = this.delegationContext;

    let initialResult: ExecutionResult;
    let initialData: any;
    while (initialData == null) {
      const payload = await this.asyncIterator.next();
      if (payload.done) {
        break;
      }
      initialResult = payload.value;
      initialData = initialResult?.data?.[fieldName];
    }

    const newResult = mergeDataAndErrors(initialData, initialResult.errors, onLocatedError);
    this.cache.set(getResponseKeyFromInfo(info), newResult);

    this._iterate();

    const { data, unpathedErrors } = newResult;
    const initialPath = responsePathAsArray(info.path);
    return createExternalValue(data, unpathedErrors, initialPath, subschema, context, info, this, returnType);
  }

  public update(info: GraphQLResolveInfo, result: MergedExecutionResult): void {
    const path = responsePathAsArray(info.path).slice(this.initialResultDepth);
    const pathKey = path.join('.');

    this._update(info, result, pathKey);
  }

  private _update(info: GraphQLResolveInfo, result: MergedExecutionResult, pathKey: string): void {
    this.onNewResult(
      pathKey,
      result,
      isCompositeType(getNamedType(info.returnType))
        ? {
            kind: Kind.SELECTION_SET,
            selections: [].concat(...info.fieldNodes.map(fieldNode => fieldNode.selectionSet.selections)),
          }
        : undefined
    );
  }

  public request(
    info: GraphQLResolveInfo
  ): Promise<MergedExecutionResult | AsyncIterableIterator<MergedExecutionResult>> {
    const path = responsePathAsArray(info.path).slice(this.initialResultDepth);
    const pathKey = path.join('.');
    let loader = this.loaders[pathKey];

    if (loader === undefined) {
      loader = this.loaders[pathKey] = new DataLoader(infos => this._request(path, pathKey, infos));
    }

    return loader.load(info);
  }

  private async _request(
    path: Array<string | number>,
    pathKey: string,
    infos: ReadonlyArray<GraphQLResolveInfo>
  ): Promise<Array<any>> {
    const parentPath = path.slice();
    const responseKey = parentPath.pop() as string;
    const parentKey = parentPath.join('.');

    const combinedInfo: GraphQLResolveInfo = {
      ...infos[0],
      fieldNodes: [].concat(...infos.map(info => info.fieldNodes)),
    };

    const parent = this.cache.get(parentKey);

    if (parent === undefined) {
      throw new Error(`Parent with key "${parentKey}" not available.`);
    }

    const data = parent.data[responseKey];
    if (data !== undefined) {
      const newResult = { data, unpathedErrors: parent.unpathedErrors };
      this._update(combinedInfo, newResult, pathKey);
    }

    if (fieldShouldStream(combinedInfo)) {
      return infos.map(() => this._stream(pathKey));
    }

    const result = await this.cache.request(pathKey);
    return new Array(infos.length).fill(result);
  }

  private _stream(pathKey: string): AsyncIterator<MergedExecutionResult> {
    const cache = this.cache;
    return new Repeater(async (push, stop) => {
      const initialResult = await cache.request(pathKey);
      const initialData = initialResult.data;

      let stopped = false;
      stop.then(() => (stopped = true));
      this.stoppers.push(stop);

      let index = 0;

      /* eslint-disable no-unmodified-loop-condition */
      while (!stopped && index < initialData.length) {
        const data = initialData[index++];
        await push({ data, unpathedErrors: initialResult.unpathedErrors });
      }

      while (!stopped) {
        await push(cache.request(`${pathKey}.${index++}`));
      }
      /* eslint-disable no-unmodified-loop-condition */
    });
  }

  private async _iterate(): Promise<void> {
    let hasNext = true;
    while (hasNext) {
      const payload = await this.asyncIterator.next();

      hasNext = !payload.done;
      const asyncResult = payload.value;

      if (asyncResult == null) {
        continue;
      }

      const path = asyncResult.path;

      if (path[0] !== this.fieldName) {
        // TODO: throw error?
        continue;
      }

      const newResult = mergeDataAndErrors(asyncResult.data, asyncResult.errors, this.delegationContext.onLocatedError);

      this.onNewResult(path.join('.'), newResult, this.asyncSelectionSets[asyncResult.label]);
    }

    setTimeout(() => {
      this.cache.clear();
      this.stoppers.forEach(stop => stop());
    });
  }

  private onNewResult(pathKey: string, newResult: MergedExecutionResult, selectionSet: SelectionSetNode): void {
    const result = this.cache.get(pathKey);
    const mergedResult =
      result === undefined
        ? newResult
        : mergeResults(this.delegationContext.info.schema, result.data.__typename, result, newResult, selectionSet);

    this.cache.set(pathKey, mergedResult);
  }
}

export function mergeResults(
  schema: GraphQLSchema,
  typeName: string,
  target: MergedExecutionResult,
  source: MergedExecutionResult,
  selectionSet: SelectionSetNode
): MergedExecutionResult {
  if (isObjectType(schema.getType(typeName))) {
    const fieldNodes = collectFields(
      {
        schema,
        variableValues: {},
        fragments: {},
      } as GraphQLExecutionContext,
      schema.getType(typeName) as GraphQLObjectType,
      selectionSet,
      Object.create(null),
      Object.create(null)
    );

    const targetData = target.data;
    const sourceData = source.data;
    Object.keys(fieldNodes).forEach(responseKey => {
      targetData[responseKey] = sourceData[responseKey];
    });
  }

  target.unpathedErrors.push(...(source.unpathedErrors ?? []));

  return target;
}
