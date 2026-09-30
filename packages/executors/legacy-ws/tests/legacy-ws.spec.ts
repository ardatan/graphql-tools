import { parse } from 'graphql';
import { buildWSLegacyExecutor, LEGACY_WS } from '@graphql-tools/executor-legacy-ws';
import { ExecutionResult } from '@graphql-tools/utils';

const document = parse(/* GraphQL */ `
  subscription PrivateEvents {
    privateEvents {
      id
    }
  }
`);

class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeSocket.CONNECTING;
  sent: string[] = [];
  terminated = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: { toString(encoding?: string): string } }) => void) | null = null;
  onerror: ((event: { error: Error }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(
    public url: string,
    public protocol: string,
    public options?: Record<string, unknown>,
  ) {
    sockets.push(this);
  }

  send(data: string, callback?: (error?: Error) => void) {
    this.sent.push(data);
    callback?.();
  }

  terminate() {
    this.terminated = true;
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }

  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }

  receive(message: unknown) {
    this.receiveRaw(JSON.stringify(message));
  }

  receiveRaw(raw: string) {
    this.onmessage?.({
      data: {
        toString: () => raw,
      },
    });
  }

  closeFromPeer() {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }
}

let sockets: FakeSocket[] = [];

function initPayload(socket: FakeSocket) {
  const init = socket.sent
    .map(raw => JSON.parse(raw))
    .find(message => message.type === LEGACY_WS.CONNECTION_INIT);
  return init?.payload;
}

function startMessage(socket: FakeSocket) {
  return socket.sent.map(raw => JSON.parse(raw)).find(message => message.type === LEGACY_WS.START);
}

function asSubscription(result: unknown): AsyncIterableIterator<ExecutionResult> {
  if (
    result != null &&
    typeof result === 'object' &&
    Symbol.asyncIterator in result &&
    typeof (result as AsyncIterableIterator<ExecutionResult>).next === 'function'
  ) {
    return result as AsyncIterableIterator<ExecutionResult>;
  }
  throw new Error('Expected a subscription iterator');
}

describe('buildWSLegacyExecutor', () => {
  beforeEach(() => {
    sockets = [];
  });

  it('does not replay a previous request connectionParams on the next connection', async () => {
    const exec = buildWSLegacyExecutor('ws://localhost/graphql', FakeSocket as any);

    const victim = asSubscription(
      exec({
        document,
        extensions: {
          connectionParams: {
            Authorization: 'Bearer victim-token',
            tenant: 'alice-tenant',
          },
        },
      }),
    );
    const victimNext = victim.next();
    sockets[0]!.open();
    sockets[0]!.receive({ type: LEGACY_WS.CONNECTION_ACK });
    const victimId = startMessage(sockets[0]!)?.id;
    sockets[0]!.receive({
      type: LEGACY_WS.DATA,
      id: victimId,
      payload: { data: { privateEvents: { id: '1' } } },
    });
    await victimNext;
    sockets[0]!.receive({ type: LEGACY_WS.COMPLETE, id: victimId });
    await victim.return?.();

    const anonymous = asSubscription(exec({ document }));
    const anonymousNext = anonymous.next();
    sockets[1]!.open();

    expect(initPayload(sockets[1]!)).toEqual({});
    expect(sockets[0]).not.toBe(sockets[1]);

    sockets[1]!.receive({ type: LEGACY_WS.CONNECTION_ACK });
    sockets[1]!.receive({ type: LEGACY_WS.COMPLETE, id: startMessage(sockets[1]!)?.id });
    await anonymousNext;
  });

  it('replaces omitted keys instead of merging them with the previous caller', () => {
    const exec = buildWSLegacyExecutor('ws://localhost/graphql', FakeSocket as any, {
      connectionParams: { client: 'gateway' },
    });

    exec({
      document,
      extensions: {
        connectionParams: {
          Authorization: 'Bearer victim-token',
          tenant: 'alice-tenant',
        },
      },
    });
    sockets[0]!.open();
    expect(initPayload(sockets[0]!)).toEqual({
      client: 'gateway',
      Authorization: 'Bearer victim-token',
      tenant: 'alice-tenant',
    });

    exec({
      document,
      extensions: {
        connectionParams: { tenant: 'mallory-tenant' },
      },
    });
    sockets[1]!.open();
    expect(initPayload(sockets[1]!)).toEqual({
      client: 'gateway',
      tenant: 'mallory-tenant',
    });
  });

  it('evaluates connectionParams functions per execution', () => {
    let n = 0;
    const exec = buildWSLegacyExecutor('ws://localhost/graphql', FakeSocket as any, {
      connectionParams: () => ({ n: ++n }),
    });

    exec({ document });
    exec({ document });
    sockets[0]!.open();
    sockets[1]!.open();

    expect(initPayload(sockets[0]!)).toEqual({ n: 1 });
    expect(initPayload(sockets[1]!)).toEqual({ n: 2 });
  });

  it('delivers DATA only to the operation whose id matches', async () => {
    const exec = buildWSLegacyExecutor('ws://localhost/graphql', FakeSocket as any);

    const victim = asSubscription(
      exec({
        document,
        extensions: { connectionParams: { Authorization: 'Bearer victim-token' } },
      }),
    );
    const attacker = asSubscription(
      exec({
        document,
        extensions: { connectionParams: { Authorization: 'Bearer attacker-token' } },
      }),
    );

    const victimPending = victim.next();
    const attackerPending = attacker.next();

    expect(sockets).toHaveLength(2);
    sockets[0]!.open();
    sockets[1]!.open();
    sockets[0]!.receive({ type: LEGACY_WS.CONNECTION_ACK });
    sockets[1]!.receive({ type: LEGACY_WS.CONNECTION_ACK });

    const victimId = startMessage(sockets[0]!)?.id;
    const attackerId = startMessage(sockets[1]!)?.id;
    expect(victimId).toBeDefined();
    expect(attackerId).toBeDefined();
    expect(victimId).not.toBe(attackerId);

    sockets[1]!.receive({
      type: LEGACY_WS.DATA,
      id: victimId,
      payload: { data: { privateEvents: { secret: 'VICTIM-PRIVATE-DATA' } } },
    });
    sockets[1]!.receive({
      type: LEGACY_WS.DATA,
      id: 'id-that-was-never-started',
      payload: { data: { privateEvents: { secret: 'FOREIGN' } } },
    });
    sockets[0]!.receive({
      type: LEGACY_WS.DATA,
      id: victimId,
      payload: { data: { privateEvents: { secret: 'VICTIM-PRIVATE-DATA' } } },
    });
    sockets[1]!.receive({
      type: LEGACY_WS.DATA,
      id: attackerId,
      payload: { data: { privateEvents: { secret: 'ATTACKER-OWN' } } },
    });

    await expect(victimPending).resolves.toEqual({
      done: false,
      value: { data: { privateEvents: { secret: 'VICTIM-PRIVATE-DATA' } } },
    });
    await expect(attackerPending).resolves.toEqual({
      done: false,
      value: { data: { privateEvents: { secret: 'ATTACKER-OWN' } } },
    });

    await victim.return?.();
    await attacker.return?.();
  });

  it('drops ERROR and COMPLETE frames that belong to another operation', async () => {
    const exec = buildWSLegacyExecutor('ws://localhost/graphql', FakeSocket as any);
    const iterator = asSubscription(exec({ document }));
    const pending = iterator.next();
    sockets[0]!.open();
    sockets[0]!.receive({ type: LEGACY_WS.CONNECTION_ACK });
    const id = startMessage(sockets[0]!)?.id;

    sockets[0]!.receive({ type: LEGACY_WS.ERROR, id: 'other', payload: [{ message: 'nope' }] });
    sockets[0]!.receive({ type: LEGACY_WS.COMPLETE, id: 'other' });
    expect(sockets[0]!.terminated).toBe(false);

    sockets[0]!.receive({
      type: LEGACY_WS.DATA,
      id,
      payload: { data: { privateEvents: { id: '1' } } },
    });
    await expect(pending).resolves.toEqual({
      done: false,
      value: { data: { privateEvents: { id: '1' } } },
    });
    await iterator.return?.();
  });

  it('verifies TLS certificates unless the caller opts out', () => {
    const exec = buildWSLegacyExecutor('wss://example.com/graphql', FakeSocket as any);
    exec({ document });
    expect(sockets[0]!.options).toMatchObject({ rejectUnauthorized: true });

    const insecure = buildWSLegacyExecutor('wss://example.com/graphql', FakeSocket as any, {
      rejectUnauthorized: false,
    });
    insecure({ document });
    expect(sockets[1]!.options).toMatchObject({ rejectUnauthorized: false });
  });

  it('ends the iterator when a frame cannot be parsed', async () => {
    const exec = buildWSLegacyExecutor('ws://localhost/graphql', FakeSocket as any);
    const iterator = asSubscription(exec({ document }));
    const pending = iterator.next();
    sockets[0]!.open();
    sockets[0]!.receiveRaw('not-json');

    await expect(pending).resolves.toEqual({
      done: false,
      value: { errors: [expect.any(SyntaxError)] },
    });
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
    expect(sockets[0]!.terminated).toBe(true);
  });

  it('completes the iterator when the peer closes the socket', async () => {
    const exec = buildWSLegacyExecutor('ws://localhost/graphql', FakeSocket as any);
    const iterator = asSubscription(exec({ document }));
    const pending = iterator.next();
    sockets[0]!.open();
    sockets[0]!.receive({ type: LEGACY_WS.CONNECTION_ACK });
    sockets[0]!.closeFromPeer();

    await expect(pending).resolves.toEqual({ done: true, value: undefined });
    expect(sockets[0]!.terminated).toBe(false);
  });

  it('completes a pending iterator when the executor is disposed', async () => {
    const exec = buildWSLegacyExecutor('ws://localhost/graphql', FakeSocket as any);
    const iterator = asSubscription(exec({ document }));
    const pending = iterator.next();
    sockets[0]!.open();
    sockets[0]!.receive({ type: LEGACY_WS.CONNECTION_ACK });

    (exec as { [Symbol.dispose](): void })[Symbol.dispose]();

    await expect(pending).resolves.toEqual({ done: true, value: undefined });
    expect(sockets[0]!.terminated).toBe(true);
  });
});
