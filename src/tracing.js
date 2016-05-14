import uuid from 'node-uuid';
import now from 'performance-now';

class Tracer {
  constructor(queryId) {
    this.queryId = queryId;
    this.events = [];
    this.idCounter = 1;
    this.startTime = (new Date()).getTime();
    this.startHrTime = now();
  }

  event(type, data) {
    // TODO ensure props is a valid props thingy
    // TODO ensure info is a valid info thingy
    // TODO ensure type is a valid type thingy
    const id = this.idCounter++;
    const timestamp = now();
    // const timestamp = (new Date()).getTime();
    this.events.push({ id, timestamp, type, data });
  }

  reportEvents(url) {
    // send the serialized events to url;
    // console.log(`reporting to ${url}`);
    return {
      url,
      startTime: this.startTime,
      startHrTime: this.startHrTime,
      events: this.events,
    };
  }
}

function decorateWithTracer(fn, tracer, info) {
  return (...args) => {
    const intervalId = tracer.event('resolver.start', info);
    try {
      const result = fn(...args);
      if (typeof result.then === 'function') {
        result.then((res) => {
          tracer.event('resolver.stop', { ...info, intervalId });
          return res;
        })
        .catch((err) => {
          // console.log('whoa, it threw an error!');
          tracer.event('resolver.stop', { ...info, intervalId });
          throw err;
        });
      } else {
        // console.log('did not return a promise. logging now');
        tracer.event('resolver.stop', { ...info, intervalId });
      }
      return result;
    } catch (e) {
      // console.log('yeah, it errored directly');
      tracer.event('resolver.stop', { ...info, intervalId });
      throw e;
    }
  };
}

export { Tracer, decorateWithTracer };
