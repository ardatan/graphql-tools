import { DefinitionNode } from 'graphql';
export declare const uniqueCode =
  "\n  var names = {};\n  function unique(defs) {\n    return defs.filter(function (def) {\n      if (def.kind !== 'FragmentDefinition') return true;\n      var name = def.name.value;\n      if (names[name]) {\n        return false;\n      } else {\n        names[name] = true;\n        return true;\n      }\n    });\n  };\n";
export declare function useUnique(): (defs: DefinitionNode[]) => DefinitionNode[];
