import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createContext, runInContext } from 'node:vm';
import template from '@babel/template';

assert.equal(typeof global.gc, 'function', 'Run this check with --expose-gc');

function makeCase({ retainBuilder, retainReceiver }) {
  const context = createContext({ template });
  const receiver = runInContext(
    `({ build() { return template.statement("const result = 1;"); } })`,
    context,
    { filename: 'ephemeral-template-consumer.js' },
  );
  const consumerGlobal = runInContext('globalThis', context);
  const builder = receiver.build();
  assert.equal(Object.getPrototypeOf(builder), Function.prototype);
  return {
    receiverRef: new WeakRef(receiver),
    globalRef: new WeakRef(consumerGlobal),
    builder: retainBuilder ? builder : undefined,
    strongReceiver: retainReceiver ? receiver : undefined,
  };
}

async function collect(refs) {
  // WeakRef.deref keeps its target alive until the current job ends. Cross a
  // job boundary before every collection instead of testing and collecting in
  // the same job. The controls below validate this observer in the same run.
  for (let round = 0; round < 20; round++) {
    await nextTurn();
    global.gc();
    await nextTurn();
    if (refs.every(ref => ref.deref() === undefined)) return true;
  }
  return false;
}

function assertBuilderWorks(builder) {
  const statement = builder();
  assert.equal(statement.type, 'VariableDeclaration');
  assert.equal(statement.declarations[0].id.name, 'result');
  assert.equal(statement.declarations[0].init.value, 1);
}

test('an unretained builder and consumer can be collected', async () => {
  const state = makeCase({ retainBuilder: false, retainReceiver: false });
  assert.equal(await collect([state.receiverRef, state.globalRef]), true);
});

test('the observer detects an explicitly retained consumer', async () => {
  const state = makeCase({ retainBuilder: true, retainReceiver: true });
  assert.equal(await collect([state.receiverRef]), false);
  assert.equal(state.receiverRef.deref(), state.strongReceiver);
  assertBuilderWorks(state.builder);
});

test('a usable retained builder does not retain its consumer', async () => {
  const state = makeCase({ retainBuilder: true, retainReceiver: false });
  const collected = await collect([state.receiverRef, state.globalRef]);
  assertBuilderWorks(state.builder);
  assert.equal(collected, true, 'the builder retained its consumer receiver or VM global');
});

function createBuilderAtNamedOrigin() {
  return template.statement('const VALUE = 1;');
}

test('template failures keep their message and originating stack', () => {
  const builder = createBuilderAtNamedOrigin();
  assert.throws(
    () => builder({}),
    error =>
      error.message.includes('No substitution given for "VALUE"') &&
      error.stack.includes('=============') &&
      error.stack.includes('createBuilderAtNamedOrigin'),
  );
});

for (const [name, formatter] of [
  ['structured', (_error, frames) => frames],
  ['undefined', () => undefined],
  [
    'throwing',
    () => {
      throw new Error('formatter failure');
    },
  ],
]) {
  test(`custom ${name} stack formatting does not break templates or replace errors`, () => {
    const descriptor = Object.getOwnPropertyDescriptor(Error, 'prepareStackTrace');
    const sentinel = new Error('replacement failure');
    try {
      Error.prepareStackTrace = formatter;
      assertBuilderWorks(template.statement('const result = 1;'));
      const builder = createBuilderAtNamedOrigin();
      const replacements = Object.defineProperty({}, 'VALUE', {
        enumerable: true,
        get() {
          throw sentinel;
        },
      });
      assert.throws(
        () => builder(replacements),
        error => error === sentinel,
      );
    } finally {
      if (descriptor) Object.defineProperty(Error, 'prepareStackTrace', descriptor);
      else Reflect.deleteProperty(Error, 'prepareStackTrace');
    }
  });
}
