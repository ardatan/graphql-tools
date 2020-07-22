import { DefinitionNode } from 'graphql';

export const uniqueCode = `
  const names = {};
  function unique(defs: DefinitionNode[]) {
    return defs.filter((def) => {
      if (def.kind !== 'FragmentDefinition') return true;
      const name = def.name.value;
      if (names[name]) {
        return false;
      } else {
        names[name] = true;
        return true;
      }
    });
  };
`;

export function useUnique() {
  const names = {};
  return function unique(defs: DefinitionNode[]) {
    return defs.filter(def => {
      if (def.kind !== 'FragmentDefinition') return true;
      const name = def.name.value;
      if (names[name]) {
        return false;
      } else {
        names[name] = true;
        return true;
      }
    });
  };
}
