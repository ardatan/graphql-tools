// See: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/memoizee/index.d.ts

declare module 'memoizee/weak' {
  interface Options<F extends (...args: any[]) => any> {
    length?: number | false | undefined;
    maxAge?: number | undefined;
    max?: number | undefined;
    preFetch?: number | true | undefined;
    promise?: boolean | undefined;
    dispose?(value: any): void;
    async?: boolean | undefined;
    primitive?: boolean | undefined;
    normalizer?(args: Parameters<F>): string;
    resolvers?: Array<(arg: any) => any> | undefined;
  }

  interface Memoized<F> {
    delete: F;
    clear: F & (() => void);
  }

  export default function memoized<F extends (...args: any[]) => any>(f: F, options?: Options<F>): F & Memoized<F>;
}
