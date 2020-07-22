import { parse, DocumentNode, print, Kind, DefinitionNode, FragmentDefinitionNode } from 'graphql';

/**
 * Strip insignificant whitespace
 * Note that this could do a lot more, such as reorder fields etc.
 */
function normalize(str: string) {
  return str.replace(/[\s,]+/g, ' ').trim();
}

// A map docString -> graphql document
const docCache: Record<string, DocumentNode> = {};

// A map fragmentName -> [normalized source]
const fragmentSourceMap: {
  [fragmentName: string]: {
    [sourceKey: string]: boolean;
  };
} = {};

function cacheKeyFromFragment(fragment: FragmentDefinitionNode): string {
  return normalize(print(fragment));
}

/**
 * Take a unstripped parsed document (query/mutation or even fragment), and
 * check all fragment definitions, checking for name->source uniqueness.
 * We also want to make sure only unique fragments exist in the document.
 */
function processFragments(ast: DocumentNode) {
  const astFragmentMap: Record<string, boolean> = {};
  const definitions: DefinitionNode[] = [];

  for (let i = 0; i < ast.definitions.length; i++) {
    const fragmentDefinition = ast.definitions[i];

    if (fragmentDefinition.kind === Kind.FRAGMENT_DEFINITION) {
      const fragmentName = fragmentDefinition.name.value;
      const sourceKey = cacheKeyFromFragment(fragmentDefinition);

      // We know something about this fragment
      if (fragmentSourceMap.hasOwnProperty(fragmentName) && !fragmentSourceMap[fragmentName][sourceKey]) {
        fragmentSourceMap[fragmentName][sourceKey] = true;
      } else if (!fragmentSourceMap.hasOwnProperty(fragmentName)) {
        fragmentSourceMap[fragmentName] = {};
        fragmentSourceMap[fragmentName][sourceKey] = true;
      }

      if (!astFragmentMap[sourceKey]) {
        astFragmentMap[sourceKey] = true;
        definitions.push(fragmentDefinition);
      }
    } else {
      definitions.push(fragmentDefinition);
    }
  }

  (ast as any).definitions = definitions;
  return ast;
}

export function parseDocument(doc: string) {
  const cacheKey = normalize(doc);

  if (docCache[cacheKey]) {
    return docCache[cacheKey];
  }

  const parsed = parse(doc, {
    noLocation: true,
  });
  if (!parsed || parsed.kind !== 'Document') {
    throw new Error('Not a valid GraphQL document.');
  }

  // check that all "new" fragments inside the documents are consistent with
  // existing fragments of the same name
  docCache[cacheKey] = processFragments(parsed);

  return parsed;
}
