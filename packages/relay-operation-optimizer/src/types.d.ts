declare module 'relay-compiler/lib/core/Schema.js' {
  export function create(schema: string): import('relay-compiler').Schema;
}

declare module 'relay-compiler/lib/core/IRPrinter.js' {
  export function print(schema: import('relay-compiler').Schema, document: any): string;
}

declare module 'relay-compiler/lib/core/CompilerContext.js' {
  let CompilerContext: typeof import('relay-compiler').CompilerContext;
  export = CompilerContext;
}
