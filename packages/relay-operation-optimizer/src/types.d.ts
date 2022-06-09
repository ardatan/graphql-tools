declare module '@ardatan/relay-compiler/lib/core/Schema.js' {
  export function create(schema: string): import('relay-compiler').Schema;
}

declare module '@ardatan/relay-compiler/lib/core/IRPrinter.js' {
  export function print(schema: import('relay-compiler').Schema, document: any): string;
}

declare module '@ardatan/relay-compiler/lib/core/CompilerContext.js' {
  let CompilerContext: typeof import('relay-compiler').CompilerContext;
  export = CompilerContext;
}

declare module '@ardatan/relay-compiler/lib/transforms/SkipRedundantNodesTransform.js' {
  let transform: typeof import('relay-compiler/lib/transforms/SkipRedundantNodesTransform.js');
  export = transform;
}

declare module '@ardatan/relay-compiler/lib/transforms/InlineFragmentsTransform.js' {
  let transform: typeof import('relay-compiler/lib/transforms/InlineFragmentsTransform.js');
  export = transform;
}

declare module '@ardatan/relay-compiler/lib/transforms/ApplyFragmentArgumentTransform.js' {
  let transform: typeof import('relay-compiler/lib/transforms/ApplyFragmentArgumentTransform.js');
  export = transform;
}

declare module '@ardatan/relay-compiler/lib/transforms/FlattenTransform.js' {
  let transform: typeof import('relay-compiler/lib/transforms/FlattenTransform.js');
  export = transform;
}

declare module '@ardatan/relay-compiler/lib/core/RelayParser.js' {
  let RelayParser: typeof import('relay-compiler/lib/core/RelayParser.js');
  export = RelayParser;
}
