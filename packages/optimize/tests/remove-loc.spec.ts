import { parse, print } from '@graphql-tools/graphql';
import { removeLoc } from '../src/optimizers/remove-loc.js';

describe('removeLoc', () => {
  it('Should remove location field', () => {
    const doc = parse(/* GraphQL */ `
      query findUser($userId: ID!) {
        user(id: $userId) {
          ...UserFields
        }
      }

      query something {
        test {
          test
        }
      }

      fragment UserFields on User {
        id
        username
        role
      }
    `);
    const out = removeLoc(doc);
    const stringOut = JSON.stringify(out);
    expect(stringOut).toMatchSnapshot();
    expect(stringOut).not.toContain(`"loc":`);
    expect(() => print(out)).not.toThrow();
  });
});
