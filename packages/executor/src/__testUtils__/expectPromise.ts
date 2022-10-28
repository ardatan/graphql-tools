import { isPromise } from '@graphql-tools/utils';

export function expectPromise(maybePromise: unknown) {
  expect(isPromise(maybePromise)).toBeTruthy();

  return {
    toResolve() {
      return maybePromise;
    },
    async toRejectWith(message: string) {
      let caughtError: Error | undefined;
      try {
        await maybePromise;
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError).toHaveProperty('message', message);
    },
  };
}
