import {
  ExecutionPatchResult,
  ExecutionResult,
  getNamedType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLOutputType,
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

import { AsyncExecutionResult, collectFields, getResponseKeyFromInfo, GraphQLExecutionContext } from '@graphql-tools/utils';

import { DelegationContext, MergedExecutionResult, Receiver } from './types';
import { mergeDataAndErrors } from './externalValues';
import { ExpectantStore } from './expectantStore';
import { fieldShouldStream } from './fieldShouldStream';

export class InitialReceiver implements Receiver {
  private readonly asyncIterable: AsyncIterable<AsyncExecutionResult>;
  private readonly delegationContext: DelegationContext;
  private readonly fieldName: string;
  private readonly asyncSelectionSets: Record<string, SelectionSetNode>;
  private readonly resultTransformer: (originalResult: ExecutionResult) => any;
  private readonly initialResultDepth: number;
  private deferredPatches: Record<string, Array<ExecutionPatchResult>>;
  private streamedPatches: Record<string, Record<number, Array<ExecutionPatchResult>>>;
  private cache: ExpectantStore<MergedExecutionResult>;
  private stoppers: Array<Stop>;
  private loaders: Record<string, DataLoader<GraphQLResolveInfo, any>>;
  private infos: Record<string, Record<string, GraphQLResolveInfo>>;

  constructor(
    asyncIterable: AsyncIterable<AsyncExecutionResult>,
    delegationContext: DelegationContext,
    resultTransformer: (originalResult: ExecutionResult) => any
  ) {
    this.asyncIterable = asyncIterable;

    this.delegationContext = delegationContext;
    const { fieldName, info, asyncSelectionSets } = delegationContext;

    this.fieldName = fieldName;
    this.asyncSelectionSets = asyncSelectionSets;

    this.resultTransformer = resultTransformer;
    this.initialResultDepth = info ? responsePathAsArray(info.path).length - 1 : 0;

    this.deferredPatches = Object.create(null);
    this.streamedPatches = Object.create(null);
    this.cache = new ExpectantStore();
    this.stoppers = [];
    this.loaders = Object.create(null);
    this.infos = Object.create(null);
  }

  public async getInitialResult(): Promise<MergedExecutionResult> {
    const { fieldName, info, onLocatedError } = this.delegationContext;

    let initialResult: ExecutionResult;
    let initialData: any;
    for await (const payload of this.asyncIterable) {
      initialResult = this.resultTransformer(payload);
      initialData = initialResult?.data?.[fieldName];
      if (initialData != null) {
        break;
      }
    }

    const fullPath = responsePathAsArray(info.path);
    const newResult = mergeDataAndErrors(initialData, initialResult.errors, fullPath, onLocatedError);
    this.cache.set(getResponseKeyFromInfo(info), newResult);

    this._iterate();

    return newResult;
  }

  public update(info: GraphQLResolveInfo, result: MergedExecutionResult): void {
    const path = responsePathAsArray(info.path).slice(this.initialResultDepth);
    const pathKey = path.join('.');

    this._update(info, result, pathKey);
  }

  private _update(
    info: GraphQLResolveInfo,
    result: MergedExecutionResult,
    pathKey: string,
  ): void {
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

  public request(info: GraphQLResolveInfo): Promise<MergedExecutionResult> {
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

    let infosByParentKey = this.infos[parentKey];
    if (infosByParentKey === undefined) {
      infosByParentKey = this.infos[parentKey] = Object.create(null);
    }

    if (infosByParentKey[responseKey] === undefined) {
      infosByParentKey[responseKey] = combinedInfo;
      this.onNewInfo(pathKey, combinedInfo);
    }

    const parent = this.cache.get(parentKey);

    if (parent === undefined) {
      throw new Error(`Parent with key "${parentKey}" not available.`)
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
    const iterator = this.asyncIterable[Symbol.asyncIterator]();

    let hasNext = true;
    while (hasNext) {
      const payload = (await iterator.next()) as IteratorResult<ExecutionPatchResult, ExecutionPatchResult>;

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

      const transformedResult = this.resultTransformer(asyncResult);

      if (path.length === 1) {
        const pathKey = path.join('.');

        const { info, onLocatedError } = this.delegationContext;
        const fullPath = responsePathAsArray(info.path);
        const newResult = mergeDataAndErrors(transformedResult.data, transformedResult.errors, fullPath, onLocatedError);

        this.onNewResult(pathKey, newResult, this.asyncSelectionSets[asyncResult.label]);
        continue;
      }

      const lastPathSegment = path[path.length - 1];
      const isStreamPatch = typeof lastPathSegment === 'number';
      if (isStreamPatch) {
        const parentPath = path.slice();
        const index = parentPath.pop();
        const responseKey = parentPath.pop();
        const parentPathKey = parentPath.join('.');
        const pathKey = `${parentPathKey}.${responseKey}`;
        const info = this.infos[parentPathKey]?.[responseKey];
        if (info === undefined) {
          const streamedPatches = this.streamedPatches[pathKey];
          if (streamedPatches === undefined) {
            this.streamedPatches[pathKey] = { [index]: [transformedResult] };
            continue;
          }

          const indexPatches = streamedPatches[index];
          if (indexPatches === undefined) {
            streamedPatches[index] = [transformedResult];
            continue;
          }

          indexPatches.push(transformedResult);
          continue;
        }

        const { onLocatedError } = this.delegationContext;
        const fullPath = responsePathAsArray(info.path);
        const newResult = mergeDataAndErrors(transformedResult.data, transformedResult.errors, fullPath, onLocatedError);

        this.onNewResult(`${pathKey}.${index}`, newResult, this.asyncSelectionSets[asyncResult.label]);
        continue;
      }

      const parentPath = path.slice();
      const responseKey = parentPath.pop();
      const parentPathKey = parentPath.join('.');
      const pathKey = `${parentPathKey}.${responseKey}`;
      const info = this.infos[parentPathKey]?.[responseKey];
      if (info === undefined) {
        const deferredPatches = this.deferredPatches[pathKey];
        if (deferredPatches === undefined) {
          this.deferredPatches[pathKey] = [transformedResult];
          continue;
        }

        deferredPatches.push(transformedResult);
        continue;
      }

      const { onLocatedError } = this.delegationContext;
      const fullPath = responsePathAsArray(info.path);
      const newResult = mergeDataAndErrors(transformedResult.data, transformedResult.errors, fullPath, onLocatedError);

      this.onNewResult(pathKey, newResult, this.asyncSelectionSets[asyncResult.label]);
    }

    setTimeout(() => {
      this.cache.clear();
      this.stoppers.forEach(stop => stop());
    });
  }

  private onNewResult(pathKey: string, newResult: MergedExecutionResult, selectionSet: SelectionSetNode): void {
    const result = this.cache.get(pathKey);
    const mergedResult = result === undefined
      ? newResult
      : mergeResults(
          this.delegationContext.info.schema,
          result.data.__typename,
          result,
          newResult,
          selectionSet
        );

    this.cache.set(pathKey, mergedResult);

    const infosByParentKey = this.infos[pathKey];
    if (infosByParentKey !== undefined) {
      const unpathedErrors = newResult.unpathedErrors;
      Object.keys(infosByParentKey).forEach(responseKey => {
        const info = infosByParentKey[responseKey];
        const data = newResult.data[responseKey];
        if (data !== undefined) {
          const subResult = { data, unpathedErrors };
          const subPathKey = `${pathKey}.${responseKey}`;
          this.onNewResult(
            subPathKey,
            subResult,
            isCompositeType(getNamedType(info.returnType))
              ? {
                  kind: Kind.SELECTION_SET,
                  selections: [].concat(...info.fieldNodes.map(fieldNode => fieldNode.selectionSet.selections)),
                }
              : undefined
          );
        }
      });
    }
  }

  private onNewInfo(pathKey: string, info: GraphQLResolveInfo): void {
    const deferredPatches = this.deferredPatches[pathKey];
    if (deferredPatches !== undefined) {
      deferredPatches.forEach(deferredPatch => {
        const { onLocatedError } = this.delegationContext;
        const fullPath = responsePathAsArray(info.path);
        const newResult = mergeDataAndErrors(deferredPatch.data, deferredPatch.errors, fullPath, onLocatedError);
        this.onNewResult(pathKey, newResult, this.asyncSelectionSets[deferredPatch.label]);
      });
    }

    const streamedPatches = this.streamedPatches[pathKey];
    if (streamedPatches !== undefined) {
      const listMemberInfo: GraphQLResolveInfo = {
        ...info,
        returnType: (info.returnType as GraphQLList<GraphQLOutputType>).ofType,
      };
      Object.entries(streamedPatches).forEach(([index, indexPatches]) => {
        indexPatches.forEach(patch => {
          const { onLocatedError } = this.delegationContext;
          const fullPath = responsePathAsArray(listMemberInfo.path);
          const newResult = mergeDataAndErrors(patch.data, patch.errors, fullPath, onLocatedError);
          this.onNewResult(`${pathKey}.${index}`, newResult, this.asyncSelectionSets[patch.label]);
        });
      });
    }
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

  target.unpathedErrors.push(...source.unpathedErrors ?? []);

  return target;
}
