export interface PropertyTree {
  [property: string]: any | PropertyTree;
}

export interface ParsedMergeArgsExpr {
  args: PropertyTree;
  mappingInstructions: Array<MappingInstruction>;
  expansions: Array<Expansion>;
}

export interface MappingInstruction {
  destinationPath: Array<string>;
  sourcePath: Array<string>;
}

export interface Expansion {
  valuePath: Array<string>;
  value: PropertyTree;
  mappingInstructions: Array<MappingInstruction>;
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
