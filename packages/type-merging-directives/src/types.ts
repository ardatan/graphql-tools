export interface ParsedMergeArgsExpr {
  args: Record<string, any>;
  keyDeclarations: Array<KeyDeclaration>;
  expansions: Array<Expansion>;
}

export interface KeyDeclaration {
  valuePath: Array<string | number>;
  keyPath: Array<string>;
}

export interface Expansion {
  valuePath: Array<string | number>;
  value: any;
  keyDeclarations: Array<KeyDeclaration>;
}

export type VariablePaths = Record<string, Array<string | number>>;

export interface TypeMergingDirectivesOptions {
  baseDirectiveName?: string;
  computedDirectiveName?: string;
  mergeDirectiveName?: string;
}

export interface MergedTypeResolverInfo extends ParsedMergeArgsExpr {
  fieldName: string;
  returnsList: boolean;
}
