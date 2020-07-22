import os from 'os';
import { isExecutableDefinitionNode, visit, Kind, DocumentNode } from 'graphql';
import { parseDocument } from './parser';

function isSDL(doc: DocumentNode) {
  return !doc.definitions.some(def => isExecutableDefinitionNode(def));
}

function removeDescriptions(doc: DocumentNode) {
  function transformNode(node: any) {
    if (node.description) {
      node.description = undefined;
    }

    return node;
  }

  if (isSDL(doc)) {
    return visit(doc, {
      ScalarTypeDefinition: transformNode,
      ObjectTypeDefinition: transformNode,
      InterfaceTypeDefinition: transformNode,
      UnionTypeDefinition: transformNode,
      EnumTypeDefinition: transformNode,
      EnumValueDefinition: transformNode,
      InputObjectTypeDefinition: transformNode,
      InputValueDefinition: transformNode,
      FieldDefinition: transformNode,
    });
  }

  return doc;
}

function expandImports(source: string) {
  const lines = source.split(/\r\n|\r|\n/);
  let outputCode = `
    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  `;

  lines.some(line => {
    if (line[0] === '#' && line.slice(1).split(' ')[0] === 'import') {
      const importFile = line.slice(1).split(' ')[1];
      const parseDocument = `require(${importFile})`;
      const appendDef = `doc.definitions = doc.definitions.concat(unique(${parseDocument}.definitions));`;
      outputCode += appendDef + os.EOL;
    }
    return line.length !== 0 && line[0] !== '#';
  });

  return outputCode;
}

export default function graphqlLoader(source: string) {
  this.cacheable();
  const options: {
    noDescription?: boolean;
  } = this.query || {};
  let doc = parseDocument(source);

  // Removes descriptions from Nodes
  if (options.noDescription) {
    doc = removeDescriptions(doc);
  }

  const headerCode = `
    const doc = ${JSON.stringify(doc)};
  `;

  let outputCode = '';

  // Allow multiple query/mutation definitions in a file. This parses out dependencies
  // at compile time, and then uses those at load time to create minimal query documents
  // We cannot do the latter at compile time due to how the #import code works.
  const operationCount = doc.definitions.reduce<number>((accum, op) => {
    if (op.kind === Kind.OPERATION_DEFINITION) {
      return accum + 1;
    }

    return accum;
  }, 0);

  if (operationCount < 1) {
    outputCode += `
      export default doc
    `;
  } else {
    outputCode += `
    // Collect any fragment/type references from a node, adding them to the refs Set
    function collectFragmentReferences(node, refs) {
      if (node.kind === "FragmentSpread") {
        refs.add(node.name.value);
      } else if (node.kind === "VariableDefinition") {
        var type = node.type;
        if (type.kind === "NamedType") {
          refs.add(type.name.value);
        }
      }
      if (node.selectionSet) {
        node.selectionSet.selections.forEach(function(selection) {
          collectFragmentReferences(selection, refs);
        });
      }
      if (node.variableDefinitions) {
        node.variableDefinitions.forEach(function(def) {
          collectFragmentReferences(def, refs);
        });
      }
      if (node.definitions) {
        node.definitions.forEach(function(def) {
          collectFragmentReferences(def, refs);
        });
      }
    }
    const definitionRefs = {};
    (function extractReferences() {
      doc.definitions.forEach(function(def) {
        if (def.name) {
          const refs = new Set();
          collectFragmentReferences(def, refs);
          definitionRefs[def.name.value] = refs;
        }
      });
    })();
    function findOperation(doc, name) {
      for (var i = 0; i < doc.definitions.length; i++) {
        const element = doc.definitions[i];
        if (element.name && element.name.value == name) {
          return element;
        }
      }
    }
    function oneQuery(doc, operationName) {
      // Copy the DocumentNode, but clear out the definitions
      const newDoc = {
        kind: doc.kind,
        definitions: [findOperation(doc, operationName)]
      };
      if (doc.hasOwnProperty("loc")) {
        newDoc.loc = doc.loc;
      }
      // Now, for the operation we're running, find any fragments referenced by
      // it or the fragments it references
      const opRefs = definitionRefs[operationName] || new Set();
      const allRefs = new Set();
      let newRefs = new Set();
      // IE 11 doesn't support "new Set(iterable)", so we add the members of opRefs to newRefs one by one
      opRefs.forEach(function(refName) {
        newRefs.add(refName);
      });
      while (newRefs.size > 0) {
        const prevRefs = newRefs;
        newRefs = new Set();
        prevRefs.forEach(function(refName) {
          if (!allRefs.has(refName)) {
            allRefs.add(refName);
            const childRefs = definitionRefs[refName] || new Set();
            childRefs.forEach(function(childRef) {
              newRefs.add(childRef);
            });
          }
        });
      }
      allRefs.forEach(function(refName) {
        const op = findOperation(doc, refName);
        if (op) {
          newDoc.definitions.push(op);
        }
      });
      return newDoc;
    }
    export default doc;
    `;

    for (const op of doc.definitions) {
      if (op.kind === Kind.OPERATION_DEFINITION) {
        if (!op.name) {
          if (operationCount > 1) {
            throw new Error('Query/mutation names are required for a document with multiple definitions');
          } else {
            continue;
          }
        }

        const opName = op.name.value;
        outputCode += `
        export const opName = oneQuery(doc, "${opName}");
        `;
      }
    }
  }

  const importOutputCode = expandImports(source);
  const allCode = [headerCode, importOutputCode, outputCode, ''].join(os.EOL);

  return allCode;
}
