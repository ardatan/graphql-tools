import { loadTypedefsSync } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { concatAST, DocumentNode, visit, isExecutableDefinitionNode, StringValueNode } from 'graphql';
import { getOptions } from 'loader-utils';

function isSDL(doc: DocumentNode): boolean {
  return !doc.definitions.some(def => isExecutableDefinitionNode(def));
}

function removeDescriptions(doc: DocumentNode): DocumentNode {
  function transformNode<
    T extends {
      description?: StringValueNode;
    }
  >(node: T): T {
    if (node.description) {
      return {
        ...node,
        description: undefined,
      };
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

export default function loader(this: any, path: string) {
  const callback = this.async();

  this.cacheable();

  const options = getOptions(this);

  const sources = loadTypedefsSync(path, {
    loaders: [new GraphQLFileLoader()],
    noLocation: true,
    ...options,
  });

  const documents = sources.map(source => source.document);
  const mergedDoc = concatAST(documents);

  const transformations: Array<(doc: DocumentNode) => DocumentNode> = [];

  if (options.removeDescriptions) {
    transformations.push(removeDescriptions);
  }

  const transformedDoc = transformations.reduce((doc: DocumentNode, transform) => transform(doc), mergedDoc);

  const exportStatement = options.commonjs === false ? `export default ` : `module.exports = `;

  return callback(null, `${exportStatement} ${JSON.stringify(transformedDoc)}`);
}
