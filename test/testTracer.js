import { generateSchema, addTracingToResolvers } from '../src/schemaGenerator.js';
import { expect } from 'chai';
import { graphql } from 'graphql';
import { Tracer } from '../src/tracing.js';

describe('Tracer', () => {
  const shorthand = `
    type RootQuery {
      returnArg(name: String): String
      returnErr: String
      returnPromiseArg(name: String): String
      returnPromiseErr: String
    }
    schema {
      query: RootQuery
    }
  `;

  const resolver = {
    RootQuery: {
      returnArg: (root, { name }) => {
        // return `${name}`;
        return name;
      },
      returnErr: () => {
        throw new Error('aargh!');
      },
      returnPromiseArg: (root, { name }) => {
        return Promise.resolve(name);
      },
      returnPromiseErr: () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => { reject(new Error('err')); }, 0);
        });
      },
    },
  };

  it('does basic tracing for non-promises', () => {
    const tracer = new Tracer('T1');
    const jsSchema = generateSchema(shorthand, resolver);
    addTracingToResolvers(jsSchema, tracer);
    const testQuery = `{
      returnArg(name: "it")
    }`;
    return graphql(jsSchema, testQuery).then(() => {
      const events = tracer.reportEvents('');
      expect(events.events.length).to.equal(2);
    });
  });

  it('does basic tracing for non-promise throwing an error', () => {
    const tracer = new Tracer('T1');
    const jsSchema = generateSchema(shorthand, resolver);
    addTracingToResolvers(jsSchema, tracer);
    const testQuery = `{
      returnErr
    }`;
    return graphql(jsSchema, testQuery).then(() => {
      const events = tracer.reportEvents('');
      expect(events.events.length).to.equal(2);
    });
  });

  it('does basic tracing for promises', () => {
    const tracer = new Tracer('T1');
    const jsSchema = generateSchema(shorthand, resolver);
    addTracingToResolvers(jsSchema, tracer);
    const testQuery = `{
      returnPromiseArg(name: "it")
    }`;
    return graphql(jsSchema, testQuery).then(() => {
      const events = tracer.reportEvents('');
      expect(events.events.length).to.equal(2);
    });
  });

  it('does basic tracing for promise that throws an error', () => {
    const tracer = new Tracer('T1');
    const jsSchema = generateSchema(shorthand, resolver);
    addTracingToResolvers(jsSchema, tracer);
    const testQuery = `{
      returnPromiseErr
    }`;
    return graphql(jsSchema, testQuery).then(() => {
      const events = tracer.reportEvents('');
      expect(events.events.length).to.equal(2);
    });
  });
});
