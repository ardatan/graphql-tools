import { parse, print } from 'graphql';
import { removeEmptyNodes } from '../src';

describe('removeEmptyNodes', () => {
  it('Should remove all empty notes', () => {
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
    const out = removeEmptyNodes(doc);
    const stringOut = JSON.stringify(out);
    expect(stringOut).toMatchSnapshot();
    expect(stringOut).not.toContain(`"arguments":[]`);
    expect(stringOut).not.toContain(`"directives":[]`);
    expect(stringOut).not.toContain(`"variableDefinitions":[]`);
    expect(() => print(out)).not.toThrow();
  });
});
