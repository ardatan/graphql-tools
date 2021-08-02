// See: https://github.com/anywhichway/nano-memoize/pull/30

declare module 'nano-memoize' {
  interface nanomemoize {
    clear(): void;
  }
  export default function memoized<T extends (...args: any[]) => any>(
    fn: T,
    options?: {
      /**
       * Only use the provided maxArgs for cache look-up, useful for ignoring final callback arguments
       */
      maxArgs?: number;
      /**
       * Number of milliseconds to cache a result, set to `Infinity` to never create timers or expire
       */
      maxAge?: number;
      /**
       * The serializer/key generator to use for single argument functions (optional, not recommended)
       * must be able to serialize objects and functions, by default a WeakMap is used internally without serializing
       */
      serializer?: (...args: any[]) => any;
      /**
       * the equals function to use for multi-argument functions (optional, try to avoid) e.g. deepEquals for objects
       */
      equals?: (...args: any[]) => boolean;
      /**
       * Forces the use of multi-argument paradigm, auto set if function has a spread argument or uses `arguments` in its body.
       */
      vargs?: boolean;
    }
  ): T & nanomemoize;
}
