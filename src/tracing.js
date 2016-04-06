import uuid from 'node-uuid';

class Tracer {
  // @eventGroupId: an id to group the events of this tracer together
  constructor(eventGroupId) {
    this.gid = eventGroupId;
    this.events = [];
  }

  logEvent({ props, info, type }) {
    // TODO ensure props is a valid props thingy
    // TODO ensure info is a valid info thingy
    // TODO ensure type is a valid type thingy
    const id = uuid.v4();
    const timestamp = (new Date().getTime());
    this.events.push({ id, ...props, type, info, timestamp });
    console.log(this.gid, 'logged event', type, info, 'at', timestamp);
  }

  startInterval(info) {
    const intervalId = uuid.v4();
    const type = 'startInterval';
    this.logEvent({
      props: { intervalId },
      info,
      type,
    });
    return intervalId;
  }

  stopInterval(intervalId, info) {
    const type = 'stopInterval';
    this.logEvent({
      props: { intervalId },
      info,
      type,
    });
  }

  reportEvents(url) {
    // send the serialized events to url;
    console.log(`reporting to ${url}`);
    return this.events;
  }
}

function decorateWithTracer(fn, tracer, info) {
  return (...args) => {
    const intervalId = tracer.startInterval(info);
    try {
      const result = fn(...args);
      if (typeof result.then === 'function') {
        result.then((res) => {
          tracer.stopInterval(intervalId, info);
          return res;
        })
        .catch((err) => {
          // console.log('whoa, it threw an error!');
          tracer.stopInterval(intervalId, info);
          throw err;
        });
      } else {
        // console.log('did not return a promise. logging now');
        tracer.stopInterval(intervalId, info);
      }
      return result;
    } catch (e) {
      // console.log('yeah, it errored directly');
      tracer.stopInterval(intervalId, info);
      throw e;
    }
  };
}

export { Tracer, decorateWithTracer };
