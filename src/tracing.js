import now from 'performance-now';
import uuid from 'node-uuid';
import request from 'request';

class Tracer {
  constructor({ TRACER_APP_KEY }) {
    if (!TRACER_APP_KEY || TRACER_APP_KEY.length < 36) {
      throw new Error('Tracer requires a well-formatted TRACER_APP_KEY');
    }
    this.TRACER_APP_KEY = TRACER_APP_KEY;
    this.startTime = (new Date()).getTime();
    this.startHrTime = now();
  }

  sendReport(report) {
    request.put({
      url: 'https://nim-test-ingress.appspot.com',
      json: report,
    }, (err, response) => {
      if (err) {
        console.log('err', err);
        return;
      }
      console.log('status', response.statusCode);
    });
  }

  newLoggerInstance() {
    const queryId = uuid.v4();
    const events = [];
    let idCounter = 0;
    const startTime = (new Date()).getTime();
    const startHrTime = now();

    const log = (type, data = null) => {
      const id = idCounter++;
      const timestamp = now();
      // const timestamp = (new Date()).getTime();
      // console.log(timestamp, type, id, data);
      events.push({ id, timestamp, type, data });
      return id;
    };

    const report = () => {
      return {
        TRACER_APP_KEY: this.TRACER_APP_KEY,
        tracerApiVersion: '0.0.1',
        queryId,
        startTime,
        startHrTime,
        events,
      };
    };

    const submit = () => {
      this.sendReport(report());
    };

    return {
      log,
      report,
      submit,
    };
  }

  /* log(type, data = null) {
    // TODO ensure props is a valid props thingy
    // TODO ensure info is a valid info thingy
    // TODO ensure type is a valid type thingy
    const id = this.idCounter++;
    const timestamp = now();
    // const timestamp = (new Date()).getTime();
    console.log(timestamp, type, id, data);
    this.events.push({ id, timestamp, type, data });
    return id;
  }

  report() {
    return {
      queryId: this.queryId,
      startTime: this.startTime,
      startHrTime: this.startHrTime,
      events: this.events,
    };
  } */
}

function decorateWithTracer(fn, info) {
  return (p, a, ctx, i) => {
    const startEventId = ctx.tracer.log('resolver.start', info);
    try {
      const result = fn(p, a, ctx, i);
      if (typeof result.then === 'function') {
        result.then((res) => {
          ctx.tracer.log('resolver.end', { ...info, startEventId });
          return res;
        })
        .catch((err) => {
          // console.log('whoa, it threw an error!');
          ctx.tracer.log('resolver.end', { ...info, startEventId });
          throw err;
        });
      } else {
        // console.log('did not return a promise. logging now');
        ctx.tracer.log('resolver.end', { ...info, startEventId });
      }
      return result;
    } catch (e) {
      // console.log('yeah, it errored directly');
      ctx.tracer.log('resolver.end', { ...info, startEventId });
      throw e;
    }
  };
}

export { Tracer, decorateWithTracer };
