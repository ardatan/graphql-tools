import { print } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { parseSelectionSet } from '@graphql-tools/utils';

import { typeMergingDirectives } from '../src';

describe('type merging directives', () => {
  const { typeMergingDirectivesTypeDefs, typeMergingDirectivesTransformer } = typeMergingDirectives();

  test('transforms', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

    expect(transformedSubschemaConfig.merge).toEqual({
      User: {
        selectionSet: print(parseSelectionSet('{ id }')),
        fieldName: '_user',
      }
    });
  });
});
