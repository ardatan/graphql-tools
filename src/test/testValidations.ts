import * as chai from 'chai';
import * as spies from 'chai-spies';
chai.use(spies);
const { expect, assert, spy } = chai;
import { graphql } from 'graphql';
import {
  makeExecutableSchema,
} from '../schemaGenerator';
import 'mocha';

describe('validation', () => {
  const typeDefs = `
    type Post {
      id: Int
      author: String
      notes: String
    }

    type Query {
      post(id: Int!): Post
    }

    schema {
      query: Query
    }
  `;

  it('should call the validator for a field', () => {
    const resolvers = {
      Query: {
        post: (_: any, { id }: { id: number }) => ({
          id,
          author: 'Max',
          notes: 'Hello world',
        }),
      },
    };
    const validationSpy = spy();

    const validations = {
      Query: {
        post: (_: any, { id }: { id: number }) => validationSpy() || true,
      },
    };

    const jsSchema = makeExecutableSchema({ typeDefs, resolvers, validations });
    const validQuery = `
      {
        post(id: 2) {
          id
          author
          notes
        }
      }
    `;
    return graphql(jsSchema, validQuery)
      .then(result => {
        expect(validationSpy).to.have.been.called();
        assert.deepEqual(result.data.post, {
          id: 2,
          author: 'Max',
          notes: 'Hello world'
        });
        assert.equal(result.errors, undefined);
      });
  });

  it('should not call the resolver if the validator returns false', () => {
    const validationSpy = spy();
    const resolverSpy = spy();

    const resolvers = {
      Query: {
        post: (_: any, { id }: { id: number }) => resolverSpy() || ({
          id,
          author: 'Max',
          notes: 'Hello world',
        }),
      },
    };

    const validations = {
      Query: {
        post: (_: any, { id }: { id: number }) => validationSpy() || false,
      },
    };

    const jsSchema = makeExecutableSchema({ typeDefs, resolvers, validations });
    const invalidQuery = `
      {
        post(id: 2) {
          id
          author
          notes
        }
      }
    `;
    return graphql(jsSchema, invalidQuery)
      .then(result => {
        expect(validationSpy).to.have.been.called();
        expect(resolverSpy).to.not.have.been.called();
        assert.equal(result.data.post, null);
        assert.equal(result.errors, undefined);
      });
  });

  it('should allow promises in validators', () => {
    const validationSpy = spy();
    const resolverSpy = spy();

    const resolvers = {
      Query: {
        post: (_: any, { id }: { id: number }) => resolverSpy() || ({
          id,
          author: 'Max',
          notes: 'Hello world',
        }),
      },
    };

    const validations = {
      Query: {
        post: (_: any, { id }: { id: number }) => validationSpy() || Promise.resolve(true),
      },
    };

    const jsSchema = makeExecutableSchema({ typeDefs, resolvers, validations });
    const validQuery = `
      {
        post(id: 2) {
          id
          author
          notes
        }
      }
    `;
    return graphql(jsSchema, validQuery)
      .then(result => {
        expect(validationSpy).to.have.been.called();
        expect(resolverSpy).to.have.been.called();
        assert.deepEqual(result.data.post, {
          id: 2,
          author: 'Max',
          notes: 'Hello world'
        });
        assert.equal(result.errors, undefined);
      });
  });
});
