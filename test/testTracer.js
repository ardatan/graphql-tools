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

  const t1 = new Tracer({ TRACER_APP_KEY: 'BDE05C83-E58F-4837-8D9A-9FB5EA605D2A' });
  const jsSchema = generateSchema(shorthand, resolver);
  addTracingToResolvers(jsSchema);

  it('does basic tracing for non-promises', () => {
    const testQuery = `{
      returnArg(name: "it")
    }`;
    const tracer = t1.newLoggerInstance();
    return graphql(jsSchema, testQuery, null, { tracer }).then(() => {
      const report = tracer.report('');
      expect(report.events.length).to.equal(2);
    });
  });

  it('does basic tracing for non-promise throwing an error', () => {
    const tracer = t1.newLoggerInstance();
    addTracingToResolvers(jsSchema);
    const testQuery = `{
      returnErr
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then(() => {
      const report = tracer.report('');
      expect(report.events.length).to.equal(2);
    });
  });

  it('does basic tracing for promises', () => {
    const tracer = t1.newLoggerInstance();
    addTracingToResolvers(jsSchema);
    const testQuery = `{
      returnPromiseArg(name: "it")
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then(() => {
      const report = tracer.report('');
      expect(report.events.length).to.equal(2);
    });
  });

  it('does basic tracing for promise that throws an error', () => {
    const tracer = t1.newLoggerInstance();
    addTracingToResolvers(jsSchema);
    const testQuery = `{
      returnPromiseErr
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then(() => {
      const report = tracer.report('');
      expect(report.events.length).to.equal(2);
    });
  });
});
