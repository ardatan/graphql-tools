import { GraphQLInt, GraphQLObjectType, GraphQLSchema, parse } from 'graphql';
import { expectJSON } from '../../__testUtils__/expectJSON.js';
import { resolveOnNextTick } from '../../__testUtils__/resolveOnNextTick.js';
import { execute, executeSync } from '../execute.js';

class NumberHolder {
  theNumber: number;

  constructor(originalNumber: number) {
    this.theNumber = originalNumber;
  }
}

class Root {
  numberHolder: NumberHolder;

  constructor(originalNumber: number) {
    this.numberHolder = new NumberHolder(originalNumber);
  }

  immediatelyChangeTheNumber(newNumber: number): NumberHolder {
    this.numberHolder.theNumber = newNumber;
    return this.numberHolder;
  }

  async promiseToChangeTheNumber(newNumber: number): Promise<NumberHolder> {
    await resolveOnNextTick();
    return this.immediatelyChangeTheNumber(newNumber);
  }

  failToChangeTheNumber(): NumberHolder {
    throw new Error('Cannot change the number');
  }

  async promiseAndFailToChangeTheNumber(): Promise<NumberHolder> {
    await resolveOnNextTick();
    throw new Error('Cannot change the number');
  }
}

const numberHolderType = new GraphQLObjectType({
  fields: {
    theNumber: { type: GraphQLInt },
    promiseToGetTheNumber: {
      type: GraphQLInt,
      resolve: async root => {
        await new Promise(resolve => setTimeout(resolve, 0));
        return root.theNumber;
      },
    },
  },
  name: 'NumberHolder',
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    fields: {
      numberHolder: { type: numberHolderType },
    },
    name: 'Query',
  }),
  mutation: new GraphQLObjectType({
    fields: {
      immediatelyChangeTheNumber: {
        type: numberHolderType,
        args: { newNumber: { type: GraphQLInt } },
        resolve(obj, { newNumber }) {
          return obj.immediatelyChangeTheNumber(newNumber);
        },
      },
      promiseToChangeTheNumber: {
        type: numberHolderType,
        args: { newNumber: { type: GraphQLInt } },
        resolve(obj, { newNumber }) {
          return obj.promiseToChangeTheNumber(newNumber);
        },
      },
      failToChangeTheNumber: {
        type: numberHolderType,
        args: { newNumber: { type: GraphQLInt } },
        resolve(obj, { newNumber }) {
          return obj.failToChangeTheNumber(newNumber);
        },
      },
      promiseAndFailToChangeTheNumber: {
        type: numberHolderType,
        args: { newNumber: { type: GraphQLInt } },
        resolve(obj, { newNumber }) {
          return obj.promiseAndFailToChangeTheNumber(newNumber);
        },
      },
    },
    name: 'Mutation',
  }),
});

describe('Execute: Handles mutation execution ordering', () => {
  it('evaluates mutations serially', async () => {
    const document = parse(`
      mutation M {
        first: immediatelyChangeTheNumber(newNumber: 1) {
          theNumber
        },
        second: promiseToChangeTheNumber(newNumber: 2) {
          theNumber
        },
        third: immediatelyChangeTheNumber(newNumber: 3) {
          theNumber
        }
        fourth: promiseToChangeTheNumber(newNumber: 4) {
          theNumber
        },
        fifth: immediatelyChangeTheNumber(newNumber: 5) {
          theNumber
        }
      }
    `);

    const rootValue = new Root(6);
    const mutationResult = await execute({ schema, document, rootValue });

    expect(mutationResult).toEqual({
      data: {
        first: { theNumber: 1 },
        second: { theNumber: 2 },
        third: { theNumber: 3 },
        fourth: { theNumber: 4 },
        fifth: { theNumber: 5 },
      },
    });
  });

  it('does not include illegal mutation fields in output', () => {
    const document = parse('mutation { thisIsIllegalDoNotIncludeMe }');

    const result = executeSync({ schema, document });
    expect(result).toEqual({
      data: {},
    });
  });

  it('evaluates mutations correctly in the presence of a failed mutation', async () => {
    const document = parse(`
      mutation M {
        first: immediatelyChangeTheNumber(newNumber: 1) {
          theNumber
        },
        second: promiseToChangeTheNumber(newNumber: 2) {
          theNumber
        },
        third: failToChangeTheNumber(newNumber: 3) {
          theNumber
        }
        fourth: promiseToChangeTheNumber(newNumber: 4) {
          theNumber
        },
        fifth: immediatelyChangeTheNumber(newNumber: 5) {
          theNumber
        }
        sixth: promiseAndFailToChangeTheNumber(newNumber: 6) {
          theNumber
        }
      }
    `);

    const rootValue = new Root(6);
    const result = await execute({ schema, document, rootValue });

    expectJSON(result).toDeepEqual({
      data: {
        first: { theNumber: 1 },
        second: { theNumber: 2 },
        third: null,
        fourth: { theNumber: 4 },
        fifth: { theNumber: 5 },
        sixth: null,
      },
      errors: [
        {
          message: 'Cannot change the number',
          locations: [{ line: 9, column: 9 }],
          path: ['third'],
        },
        {
          message: 'Cannot change the number',
          locations: [{ line: 18, column: 9 }],
          path: ['sixth'],
        },
      ],
    });
  });

  it('Mutation fields with @defer do not block next mutation', async () => {
    const document = parse(`
      mutation M {
        first: promiseToChangeTheNumber(newNumber: 1) {
          ...DeferFragment @defer(label: "defer-label")
        },
        second: immediatelyChangeTheNumber(newNumber: 2) {
          theNumber
        }
      }
      fragment DeferFragment on NumberHolder {
        promiseToGetTheNumber
      }
    `);

    const rootValue = new Root(6);
    const mutationResult = await execute({
      schema,
      document,
      rootValue,
    });
    const patches: any[] = [];

    expect('initialResult' in mutationResult).toBeTruthy();
    // @ts-expect-error once we assert that initialResult is in mutationResult then it should work fine
    patches.push(mutationResult.initialResult);
    // @ts-expect-error once we assert that initialResult is in mutationResult then it should work fine
    for await (const patch of mutationResult.subsequentResults) {
      patches.push(patch);
    }

    expectJSON(patches).toDeepEqual([
      {
        data: {
          first: {},
          second: { theNumber: 2 },
        },
        hasNext: true,
      },
      {
        incremental: [
          {
            label: 'defer-label',
            path: ['first'],
            data: {
              promiseToGetTheNumber: 2,
            },
          },
        ],
        hasNext: false,
      },
    ]);
  });

  it('Mutation inside of a fragment', async () => {
    const document = parse(`
      mutation M {
        ...MutationFragment
        second: immediatelyChangeTheNumber(newNumber: 2) {
          theNumber
        }
      }
      fragment MutationFragment on Mutation {
        first: promiseToChangeTheNumber(newNumber: 1) {
          theNumber
        },
      }
    `);

    const rootValue = new Root(6);
    const mutationResult = await execute({ schema, document, rootValue });

    expectJSON(mutationResult).toDeepEqual({
      data: {
        first: { theNumber: 1 },
        second: { theNumber: 2 },
      },
    });
  });

  it('Mutation with @defer is not executed serially', async () => {
    const document = parse(`
      mutation M {
        ...MutationFragment @defer(label: "defer-label")
        second: immediatelyChangeTheNumber(newNumber: 2) {
          theNumber
        }
      }
      fragment MutationFragment on Mutation {
        first: promiseToChangeTheNumber(newNumber: 1) {
          theNumber
        },
      }
    `);

    const rootValue = new Root(6);
    const mutationResult = await execute({
      schema,
      document,
      rootValue,
    });
    const patches: any[] = [];

    expect('initialResult' in mutationResult).toBeTruthy();
    // @ts-expect-error once we assert that initialResult is in mutationResult then it should work fine
    patches.push(mutationResult.initialResult);
    // @ts-expect-error once we assert that initialResult is in mutationResult then it should work fine
    for await (const patch of mutationResult.subsequentResults) {
      patches.push(patch);
    }

    expect(patches).toEqual([
      {
        data: {
          second: { theNumber: 2 },
        },
        hasNext: true,
      },
      {
        incremental: [
          {
            label: 'defer-label',
            path: [],
            data: {
              first: {
                theNumber: 1,
              },
            },
          },
        ],
        hasNext: false,
      },
    ]);
  });
});
