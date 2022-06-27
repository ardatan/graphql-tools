import { IFieldResolver } from '@graphql-tools/utils';
import { GraphQLResolveInfo } from 'graphql';
import { IMockStore, Ref } from './types.js';
import { isRootType, makeRef } from './utils.js';

export type AllNodesFn<TContext, TArgs extends RelayPaginationParams> = (
  parent: Ref,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Ref[];

export type RelayStylePaginationMockOptions<TContext, TArgs extends RelayPaginationParams> = {
  /**
   * Use this option to apply filtering or sorting on the nodes given the
   * arguments the paginated field receives.
   *
   * ```ts
   * {
   *    User: {
   *      friends: mockedRelayStylePagination<
   *        unknown,
   *        RelayPaginationParams & { sortByBirthdateDesc?: boolean}
   *      >(
   *        store, {
   *          applyOnEdges: (edges, { sortByBirthdateDesc }) => {
   *            if (!sortByBirthdateDesc) return edges
   *            return _.sortBy(edges, (e) => store.get(e, ['node', 'birthdate']))
   *          }
   *       }),
   *    }
   * }
   * ```
   */
  applyOnNodes?: (nodeRefs: Ref[], args: TArgs) => Ref[];

  /**
   * A function that'll be used to get all the nodes used for pagination.
   *
   * By default, it will use the nodes of the field this pagination is attached to.
   *
   * This option is handy when several paginable fields should share
   * the same base nodes:
   * ```ts
   * {
   *    User: {
   *      friends: mockedRelayStylePagination(store),
   *      maleFriends: mockedRelayStylePagination(store, {
   *        allNodesFn: (userRef) =>
   *          store
   *           .get(userRef, ['friends', 'edges'])
   *           .map((e) => store.get(e, 'node'))
   *           .filter((userRef) => store.get(userRef, 'sex') === 'male')
   *      })
   *    }
   * }
   * ```
   */
  allNodesFn?: AllNodesFn<TContext, TArgs>;

  /**
   * The function that'll be used to compute the cursor of a node.
   *
   * By default, it'll use `MockStore` internal reference `Ref`'s `key`
   * as cursor.
   */
  cursorFn?: (nodeRef: Ref) => string;
};

export type RelayPaginationParams = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
};

export type RelayPageInfo = {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
};

/**
 * Produces a resolver that'll mock a [Relay-style cursor pagination](https://relay.dev/graphql/connections.htm).
 *
 * ```ts
 * const schemaWithMocks = addMocksToSchema({
 *   schema,
 *   resolvers: (store) => ({
 *     User: {
 *       friends: relayStylePaginationMock(store),
 *     }
 *   }),
 * })
 * ```
 * @param store the MockStore
 */
export const relayStylePaginationMock = <TContext, TArgs extends RelayPaginationParams = RelayPaginationParams>(
  store: IMockStore,
  {
    cursorFn = node => `${node.$ref.key}`,
    applyOnNodes,
    allNodesFn,
  }: RelayStylePaginationMockOptions<TContext, TArgs> = {}
): IFieldResolver<Ref, TContext, TArgs, any> => {
  return (parent, args, context, info) => {
    const source = isRootType(info.parentType, info.schema) ? makeRef(info.parentType.name, 'ROOT') : parent;

    const allNodesFn_ = allNodesFn ?? defaultAllNodesFn(store);
    let allNodes = allNodesFn_(source, args, context, info);

    if (applyOnNodes) {
      allNodes = applyOnNodes(allNodes, args);
    }

    const allEdges = allNodes.map(node => ({
      node,
      cursor: cursorFn(node),
    }));

    let start: number, end: number;
    const { first, after, last, before } = args;

    if (typeof first === 'number') {
      // forward pagination
      if (last || before) {
        throw new Error("if `first` is provided, `last` or `before` can't be provided");
      }
      const afterIndex = after ? allEdges.findIndex(e => e.cursor === after) : -1;
      start = afterIndex + 1;
      end = afterIndex + 1 + first;
    } else if (typeof last === 'number') {
      // backward pagination
      if (first || after) {
        throw new Error("if `last` is provided, `first` or `after` can't be provided");
      }
      const foundBeforeIndex = before ? allEdges.findIndex(e => e.cursor === before) : -1;

      const beforeIndex = foundBeforeIndex !== -1 ? foundBeforeIndex : allNodes.length;
      start = allEdges.length - (allEdges.length - beforeIndex) - last;

      // negative index on Array.slice indicate offset from end of sequence => we don't want
      if (start < 0) start = 0;

      end = beforeIndex;
    } else {
      throw new Error('A `first` or a `last` arguments should be provided');
    }

    const edges = allEdges.slice(start, end);

    const pageInfo: RelayPageInfo = {
      startCursor: edges.length > 0 ? edges[0].cursor : '',
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : '',
      hasNextPage: end < allEdges.length - 1,
      hasPreviousPage: start > 0,
    };

    return {
      edges,
      pageInfo,
      totalCount: allEdges.length,
    };
  };
};

const defaultAllNodesFn =
  <TContext, TArgs extends RelayPaginationParams>(store: IMockStore): AllNodesFn<TContext, TArgs> =>
  (parent, _, __, info) =>
    (store.get(parent, [info.fieldName, 'edges']) as Ref[]).map(e => store.get(e, 'node') as Ref);
