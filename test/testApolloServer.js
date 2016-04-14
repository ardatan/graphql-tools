// TODO: tests here. Same tests as for express-graphql?? Somehow I have to test
// the http functionality of it all. Or at least I have to simulate requests and
// responses
import { apolloServer } from '../src/apolloServer';
import { assert, expect } from 'chai';

describe('ApolloServer', () => {
  it('does something', () => {
    return expect(1).to.equal(1);
  });
});
