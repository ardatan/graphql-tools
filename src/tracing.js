import now from 'performance-now';

class Tracer {
  constructor(queryId) {
    this.queryId = queryId;
    this.events = [];
    this.idCounter = 1;
    this.startTime = (new Date()).getTime();
    this.startHrTime = now();
  }

  log(type, data = null) {
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
    const startEventId = tracer.log('resolver.start', info);
    try {
      const result = fn(...args);
      if (typeof result.then === 'function') {
        result.then((res) => {
          tracer.log('resolver.stop', { ...info, startEventId });
          return res;
        })
        .catch((err) => {
          // console.log('whoa, it threw an error!');
          tracer.log('resolver.stop', { ...info, startEventId });
          throw err;
        });
      } else {
        // console.log('did not return a promise. logging now');
        tracer.log('resolver.stop', { ...info, startEventId });
      }
      return result;
    } catch (e) {
      // console.log('yeah, it errored directly');
      tracer.log('resolver.stop', { ...info, startEventId });
      throw e;
    }
  };
}

export { Tracer, decorateWithTracer };
