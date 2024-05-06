import { Kind, print } from 'graphql';
import { SelectionSetBuilder } from '../src/SelectionSetBuilder';
import '../../testing/to-be-similar-gql-doc';
import { parseSelectionSet } from '../src/selectionSets';

describe('SelectionSetBuilder', () => {
  it('deduplicate fields', () => {
    const selectionSetBuilder = new SelectionSetBuilder();
    selectionSetBuilder.addSelection({
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: 'a',
      },
    });
    selectionSetBuilder.addSelection({
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: 'b',
      },
    });
    selectionSetBuilder.addSelection({
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: 'a',
      },
    });
    expect(selectionSetBuilder.getSelectionSet()).toMatchObject({
      selections: [
        { kind: 'Field', name: { value: 'a' } },
        { kind: 'Field', name: { value: 'b' } },
      ],
    });
  });
  it('deduplicate fragment spreads', () => {
    const selectionSetBuilder = new SelectionSetBuilder();
    selectionSetBuilder.addSelection({
      kind: Kind.FRAGMENT_SPREAD,
      name: {
        kind: Kind.NAME,
        value: 'a',
      },
    });
    selectionSetBuilder.addSelection({
      kind: Kind.FRAGMENT_SPREAD,
      name: {
        kind: Kind.NAME,
        value: 'b',
      },
    });
    selectionSetBuilder.addSelection({
      kind: Kind.FRAGMENT_SPREAD,
      name: {
        kind: Kind.NAME,
        value: 'a',
      },
    });
    expect(selectionSetBuilder.getSelectionSet()).toMatchObject({
      selections: [
        { kind: 'FragmentSpread', name: { value: 'a' } },
        { kind: 'FragmentSpread', name: { value: 'b' } },
      ],
    });
  });
  it('deduplicate inline fragments', () => {
    const selectionSetBuilder = new SelectionSetBuilder();
    selectionSetBuilder.addSelection({
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: 'a',
        },
      },
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [
          {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: 'a',
            },
          },
        ],
      },
    });
    selectionSetBuilder.addSelection({
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: 'a',
        },
      },
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [
          {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: 'b',
            },
          },
        ],
      },
    });
    selectionSetBuilder.addSelection({
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: 'a',
        },
      },
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [
          {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: 'a',
            },
          },
        ],
      },
    });
    expect(selectionSetBuilder.getSelectionSet()).toMatchObject({
      selections: [
        {
          kind: 'InlineFragment',
          typeCondition: { kind: 'NamedType', name: { value: 'a' } },
          selectionSet: {
            selections: [
              { kind: 'Field', name: { value: 'a' } },
              { kind: 'Field', name: { value: 'b' } },
            ],
          },
        },
      ],
    });
  });
  it('deduplicate inline fragments and fields', () => {
    const selectionSetBuilder = new SelectionSetBuilder();
    const selectionSet = parseSelectionSet(
      /* GraphQL */ `
        {
          __typename
          id
          ... on User {
            __typename
            id
            name
          }
          ... on Post {
            __typename
            id
            title
          }
          ... {
            extensions
          }
        }
      `,
      { noLocation: true },
    );
    for (const selection of selectionSet.selections) {
      selectionSetBuilder.addSelection(selection);
    }
    expect(print(selectionSetBuilder.getSelectionSet())).toBeSimilarGqlDoc(/* GraphQL */ `
      {
        __typename
        id
        extensions
        ... on User {
          name
        }
        ... on Post {
          title
        }
      }
    `);
  });
});
