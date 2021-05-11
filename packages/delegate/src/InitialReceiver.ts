import {
  ExecutionPatchResult,
  ExecutionResult,
  getNamedType,
  GraphQLList,
  GraphQLOutputType,
  GraphQLResolveInfo,
  isCompositeType,
  Kind,
  responsePathAsArray,
  SelectionSetNode,
} from 'graphql';

import DataLoader from 'dataloader';

import { Repeater, Stop } from '@repeaterjs/repeater';

import { AsyncExecutionResult, getResponseKeyFromInfo } from '@graphql-tools/utils';

import { DelegationContext, ExternalObject, Receiver } from './types';
import { getReceiver, getSubschema, getUnpathedErrors, mergeExternalObjects } from './externalObjects';
import { resolveExternalValue } from './resolveExternalValue';
import { externalValueFromResult, externalValueFromPatchResult } from './externalValues';
import { ExpectantStore } from './expectantStore';
import { fieldShouldStream } from './fieldShouldStream';

export class InitialReceiver implements Receiver {
  private readonly asyncIterable: AsyncIterable<AsyncExecutionResult>;
  private readonly delegationContext: DelegationContext;
  private readonly fieldName: string;
  private readonly context: Record<string, any>;
  private readonly asyncSelectionSets: Record<string, SelectionSetNode>;
  private readonly resultTransformer: (originalResult: ExecutionResult) => any;
  private readonly initialResultDepth: number;
  private deferredPatches: Record<string, Array<ExecutionPatchResult>>;
  private streamedPatches: Record<string, Record<number, Array<ExecutionPatchResult>>>;
  private cache: ExpectantStore<ExternalObject>;
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
    const { fieldName, context, info, asyncSelectionSets } = delegationContext;

    this.fieldName = fieldName;
    this.context = context;
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

  public async getInitialResult(): Promise<ExecutionResult> {
    let initialResult: any;
    for await (const payload of this.asyncIterable) {
      initialResult = externalValueFromResult(this.resultTransformer(payload), this.delegationContext, this);
      if (initialResult != null) {
        break;
      }
    }
    this.cache.set(getResponseKeyFromInfo(this.delegationContext.info), initialResult);

    this._iterate();

    return initialResult;
  }

  public update(parent: ExternalObject, info: GraphQLResolveInfo): any {
    const path = responsePathAsArray(info.path).slice(this.initialResultDepth);
    const pathKey = path.join('.');
    const responseKey = path.slice().pop() as string;
    const data = parent[responseKey];

    return this._update(parent, info, pathKey, responseKey, data);
  }

  private _update(
    parent: ExternalObject,
    info: GraphQLResolveInfo,
    pathKey: string,
    responseKey: string,
    data: any,
  ): any {
    const unpathedErrors = getUnpathedErrors(parent);
    const subschema = getSubschema(parent, responseKey);
    const receiver = getReceiver(parent, subschema);
    const newExternalValue = resolveExternalValue(data, unpathedErrors, subschema, this.context, info, receiver);
    this.onNewExternalValue(
      pathKey,
      newExternalValue,
      isCompositeType(getNamedType(info.returnType))
        ? {
            kind: Kind.SELECTION_SET,
            selections: [].concat(...info.fieldNodes.map(fieldNode => fieldNode.selectionSet.selections)),
          }
        : undefined
    );
    return newExternalValue;
  }

  public request(info: GraphQLResolveInfo): Promise<any> {
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

    const data = parent[responseKey];
    if (data !== undefined) {
      this._update(parent, combinedInfo, pathKey, responseKey, data);
    }

    if (fieldShouldStream(combinedInfo)) {
      return infos.map(() => this._stream(pathKey));
    }

    const externalValue = await this.cache.request(pathKey);
    return new Array(infos.length).fill(externalValue);
  }

  private _stream(pathKey: string): AsyncIterator<any> {
    return new Repeater(async (push, stop) => {
      const initialValues = ((await this.cache.request(pathKey)) as unknown) as Array<ExternalObject>;

      let stopped = false;
      stop.then(() => (stopped = true));
      this.stoppers.push(stop);

      let index = 0;

      /* eslint-disable no-unmodified-loop-condition */
      while (!stopped && index < initialValues.length) {
        await push(initialValues[index++]);
      }

      while (!stopped) {
        await push(this.cache.request(`${pathKey}.${index++}`));
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
        const newExternalValue = externalValueFromPatchResult(
          transformedResult,
          this.delegationContext,
          this.delegationContext.info,
          this
        );
        const pathKey = path.join('.');
        this.onNewExternalValue(pathKey, newExternalValue, this.asyncSelectionSets[asyncResult.label]);
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

        const newExternalValue = externalValueFromPatchResult(transformedResult, this.delegationContext, info, this);
        this.onNewExternalValue(`${pathKey}.${index}`, newExternalValue, this.asyncSelectionSets[asyncResult.label]);
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

      const newExternalValue = externalValueFromPatchResult(transformedResult, this.delegationContext, info, this);
      this.onNewExternalValue(`${pathKey}`, newExternalValue, this.asyncSelectionSets[asyncResult.label]);
    }

    setTimeout(() => {
      this.cache.clear();
      this.stoppers.forEach(stop => stop());
    });
  }

  private onNewExternalValue(pathKey: string, newExternalValue: any, selectionSet: SelectionSetNode): void {
    const externalValue = this.cache.get(pathKey);
    this.cache.set(
      pathKey,
      externalValue === undefined
        ? newExternalValue
        : mergeExternalObjects(
            this.delegationContext.info.schema,
            pathKey.split('.'),
            externalValue.__typename,
            externalValue,
            [newExternalValue],
            [selectionSet]
          )
    );

    const infosByParentKey = this.infos[pathKey];
    if (infosByParentKey !== undefined) {
      const unpathedErrors = getUnpathedErrors(newExternalValue);
      Object.keys(infosByParentKey).forEach(responseKey => {
        const info = infosByParentKey[responseKey];
        const data = newExternalValue[responseKey];
        if (data !== undefined) {
          const subschema = getSubschema(newExternalValue, responseKey);
          const receiver = getReceiver(newExternalValue, subschema);
          const subExternalValue = resolveExternalValue(data, unpathedErrors, subschema, this.context, info, receiver);
          const subPathKey = `${pathKey}.${responseKey}`;
          this.onNewExternalValue(
            subPathKey,
            subExternalValue,
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

    this.cache.set(pathKey, newExternalValue);
  }

  private onNewInfo(pathKey: string, info: GraphQLResolveInfo): void {
    const deferredPatches = this.deferredPatches[pathKey];
    if (deferredPatches !== undefined) {
      deferredPatches.forEach(deferredPatch => {
        const newExternalValue = externalValueFromPatchResult(deferredPatch, this.delegationContext, info, this);
        this.onNewExternalValue(pathKey, newExternalValue, this.asyncSelectionSets[deferredPatch.label]);
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
          const newExternalValue = externalValueFromPatchResult(patch, this.delegationContext, listMemberInfo, this);
          this.onNewExternalValue(`${pathKey}.${index}`, newExternalValue, this.asyncSelectionSets[patch.label]);
        });
      });
    }
  }
}
