import { generateSchema, addTracingToResolvers } from '../src/schemaGenerator.js';
import { expect } from 'chai';
import { graphql } from 'graphql';
import { Tracer, decorateWithTracer } from '../src/tracing.js';

describe('Tracer', () => {
  const shorthand = `
    type RootQuery {
      returnArg(name: String): String
      returnErr: String
      returnPromiseArg(name: String): String
      returnPromiseErr: String
      returnUndefined: Int
      returnNull: Int
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
      returnUndefined: () => undefined,
      returnNull: () => null,
    },
  };

  const t1 = new Tracer({ TRACER_APP_KEY: 'BDE05C83-E58F-4837-8D9A-9FB5EA605D2A' });
  const jsSchema = generateSchema(shorthand, resolver);
  addTracingToResolvers(jsSchema);

  it('throws an error if you construct it without valid TRACER_APP_KEY', () => {
    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const t = new Tracer({ TRACER_APP_KEY: 'uga' });
    }).to.throw('Tracer requires a well-formatted TRACER_APP_KEY');
  });

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
    const testQuery = `{
      returnPromiseErr
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then(() => {
      const report = tracer.report('');
      expect(report.events.length).to.equal(2);
    });
  });
  it('does not throw an error if the resolve function returns undefined', () => {
    const tracer = t1.newLoggerInstance();
    const testQuery = `{
      returnUndefined
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then((res) => {
      const report = tracer.report('');
      expect(report.events.length).to.equal(2);
      expect(report.events[1].data.returnedUndefined).to.equal(true);
      expect(res.data.returnUndefined).to.equal(null);
      expect(res.errors).to.equal(undefined);
    });
  });
  it('does not throw an error if the resolve function returns null', () => {
    const tracer = t1.newLoggerInstance();
    const testQuery = `{
      returnNull
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then((res) => {
      const report = tracer.report('');
      expect(report.events.length).to.equal(2);
      expect(report.events[1].data.returnedNull).to.equal(true);
      expect(res.data.returnNull).to.equal(null);
      expect(res.errors).to.equal(undefined);
    });
  });
  it('does not add tracing to schema if already added', () => {
    // same test as previous, just calling addTracingToResolvers again
    // and making sure we still log the expected number of events
    addTracingToResolvers(jsSchema);
    const tracer = t1.newLoggerInstance();
    const testQuery = `{
      returnPromiseErr
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then(() => {
      const report = tracer.report('');
      expect(report.events.length).to.equal(2);
    });
  });

  // decorateWithTracer tests
  it('reports a returnedNull when resolver returns null', () => {
    const fn = () => null;
    const decorated = decorateWithTracer(fn, { functionName: 'Test.test' });
    const tracer = t1.newLoggerInstance();
    decorated(null, null, { tracer });
    expect(tracer.report().events[1].data.returnedNull).to.equal(true);
  });

  it('reports a returnedUndefined when resolver returns null', () => {
    const fn = () => undefined;
    const decorated = decorateWithTracer(fn, { functionName: 'Test.test' });
    const tracer = t1.newLoggerInstance();
    decorated(null, null, { tracer });
    expect(tracer.report().events[1].data.returnedUndefined).to.equal(true);
  });

  it('reports a tracer.error when tracer decorator makes a boo boo', () => {
    const fn = () => { return { then() { throw new Error('boo boo'); } }; };
    const decorated = decorateWithTracer(fn, { functionName: 'Test.test' });
    const tracer = t1.newLoggerInstance();
    decorated(null, null, { tracer });
    expect(tracer.report().events[1].type).to.equal('tracer.error');
    expect(tracer.report().events[1].data.tracerError.message).to.equal('boo boo');
  });


  // send report tests
  it('calls sendReport with the right arguments', () => {
    const t2 = new Tracer({ TRACER_APP_KEY: 'BDE05C83-E58F-4837-8D9A-9FB5EA605D2A' });
    let interceptedReport = null;
    // test harness for submit
    t2.sendReport = (report) => { interceptedReport = report; };
    const tracer = t2.newLoggerInstance();
    const testQuery = `{
      returnPromiseErr
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then(() => {
      tracer.submit();
      const expected = [
        'TRACER_APP_KEY',
        'events',
        'queryId',
        'startHrTime',
        'startTime',
        'tracerApiVersion',
      ];
      expect(Object.keys(interceptedReport).sort()).to.deep.equal(expected);
      expect(interceptedReport.events.length).to.equal(2);
    });
  });

  it('does not send report if sendReports is false', () => {
    const t2 = new Tracer({
      TRACER_APP_KEY: 'BDE05C83-E58F-4837-8D9A-9FB5EA605D2A',
      sendReports: false,
    });
    let interceptedReport = null;
    // test harness for submit
    t2.sendReport = (report) => { interceptedReport = report; };
    const tracer = t2.newLoggerInstance();
    const testQuery = `{
      returnPromiseErr
    }`;
    return graphql(jsSchema, testQuery, null, { tracer }).then(() => {
      tracer.submit();
      expect(interceptedReport).to.equal(null);
    });
  });
});
