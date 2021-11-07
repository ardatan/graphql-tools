import { parse, print } from 'graphql';
import { removeDescriptions } from '../src';

describe('removeDescription', () => {
  it('Should remove description', () => {
    const doc = parse(/* GraphQL */ `
      """
      test
      """
      type Query {
        """
        something
        """
        f: String
      }
    `);
    const out = removeDescriptions(doc);
    expect(print(out).trim()).toMatchSnapshot();
  });
});
