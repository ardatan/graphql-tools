declare module 'relay-compiler/lib/core/Schema' {
  export function create(schema: string): import('relay-compiler').Schema;
}

declare module 'relay-compiler/lib/core/IRPrinter' {
  export function print(schema: import('relay-compiler').Schema, document: any): string;
}

declare module 'relay-compiler/lib/core/CompilerContext' {
  let CompilerContext: typeof import('relay-compiler').CompilerContext;
  export = CompilerContext;
}
