export interface PropertyTree {
  [property: string]: any | PropertyTree;
}

export interface ParsedMergeArgsExpr {
  args: PropertyTree;
  keyDeclarations: Array<KeyDeclaration>;
  expansions: Array<Expansion>;
}

export interface KeyDeclaration {
  valuePath: Array<string>;
  keyPath: Array<string>;
}

export interface Expansion {
  valuePath: Array<string>;
  value: any;
  keyDeclarations: Array<KeyDeclaration>;
}

export type VariablePaths = Record<string, Array<string | number>>;

export interface StitchingDirectivesOptions {
  keyDirectiveName?: string;
  computedDirectiveName?: string;
  mergeDirectiveName?: string;
  canonicalDirectiveName?: string;
  pathToDirectivesInExtensions?: Array<string>;
}

export interface MergedTypeResolverInfo extends ParsedMergeArgsExpr {
  fieldName: string;
  returnsList: boolean;
}
