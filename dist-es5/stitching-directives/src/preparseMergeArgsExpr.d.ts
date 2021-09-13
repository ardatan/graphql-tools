export declare const KEY_DELIMITER = '__dot__';
export declare const EXPANSION_PREFIX = '__exp';
export declare function preparseMergeArgsExpr(mergeArgsExpr: string): {
  mergeArgsExpr: string;
  expansionExpressions: Record<string, string>;
};
