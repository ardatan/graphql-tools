import { SimplePubSub } from './simplePubSub.js';

describe('SimplePubSub', () => {
  it('subscribe async-iterator mock', async () => {
    const pubsub = new SimplePubSub();
    const iterator = pubsub.getSubscriber(x => x);

    // Queue up publishes
    expect(pubsub.emit('Apple')).toEqual(true);
    expect(pubsub.emit('Banana')).toEqual(true);

    // Read payloads
    expect(await iterator.next()).toEqual({
      done: false,
      value: 'Apple',
    });
    expect(await iterator.next()).toEqual({
      done: false,
      value: 'Banana',
    });

    // Read ahead
    const i3 = iterator.next().then(x => x);
    const i4 = iterator.next().then(x => x);

    // Publish
    expect(pubsub.emit('Coconut')).toEqual(true);
    expect(pubsub.emit('Durian')).toEqual(true);

    // Await out of order to get correct results
    expect(await i4).toEqual({ done: false, value: 'Durian' });
    expect(await i3).toEqual({ done: false, value: 'Coconut' });

    // Read ahead
    const i5 = iterator.next().then(x => x);

    // Terminate queue
    await iterator.return();

    // Publish is not caught after terminate
    expect(pubsub.emit('Fig')).toEqual(false);

    // Find that cancelled read-ahead got a "done" result
    expect(await i5).toEqual({ done: true, value: undefined });

    // And next returns empty completion value
    expect(await iterator.next()).toEqual({
      done: true,
      value: undefined,
    });
  });
});
