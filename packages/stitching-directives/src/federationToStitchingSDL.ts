// Taken from https://github.com/gmac/federation-to-stitching-sdl/blob/main/index.js

import {
  print,
  DefinitionNode,
  DirectiveNode,
  InterfaceTypeDefinitionNode,
  InterfaceTypeExtensionNode,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  parse,
  SchemaDefinitionNode,
} from 'graphql';
import { stitchingDirectives, StitchingDirectivesResult } from './stitchingDirectives.js';

const extensionKind = /Extension$/;

type EntityKind =
  | ObjectTypeDefinitionNode
  | ObjectTypeExtensionNode
  | InterfaceTypeDefinitionNode
  | InterfaceTypeExtensionNode;

const entityKinds: typeof Kind[keyof typeof Kind][] = [
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.OBJECT_TYPE_EXTENSION,
  Kind.INTERFACE_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_EXTENSION,
];

function isEntityKind(def: DefinitionNode): def is EntityKind {
  return entityKinds.includes(def.kind);
}

function getQueryTypeDef(definitions: readonly DefinitionNode[]): ObjectTypeDefinitionNode | undefined {
  const schemaDef = definitions.find(def => def.kind === Kind.SCHEMA_DEFINITION) as SchemaDefinitionNode;
  const typeName = schemaDef
    ? schemaDef.operationTypes.find(({ operation }) => operation === 'query')?.type.name.value
    : 'Query';
  return definitions.find(
    def => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === typeName
  ) as ObjectTypeDefinitionNode;
}

// Federation services are actually fairly complex,
// as the `buildFederatedSchema` helper does a fair amount
// of hidden work to setup the Federation schema specification:
// https://www.apollographql.com/docs/federation/federation-spec/#federation-schema-specification
export function federationToStitchingSDL(
  federationSDL: string,
  stitchingConfig: StitchingDirectivesResult = stitchingDirectives()
): string {
  const doc = parse(federationSDL);
  const entityTypes: string[] = [];
  const baseTypeNames = doc.definitions.reduce((memo, typeDef) => {
    if (!extensionKind.test(typeDef.kind) && 'name' in typeDef && typeDef.name) {
      memo[typeDef.name.value] = true;
    }
    return memo;
  }, {});

  doc.definitions.forEach(typeDef => {
    // Un-extend all types (remove "extends" keywords)...
    // extended types are invalid GraphQL without a local base type to extend from.
    // Stitching merges flat types in lieu of hierarchical extensions.
    if (extensionKind.test(typeDef.kind) && 'name' in typeDef && typeDef.name && !baseTypeNames[typeDef.name.value]) {
      (typeDef.kind as string) = typeDef.kind.replace(extensionKind, 'Definition');
    }

    if (!isEntityKind(typeDef)) return;

    // Find object definitions with "@key" directives;
    // these are federated entities that get turned into merged types.
    const keyDirs: DirectiveNode[] = [];
    const otherDirs: DirectiveNode[] = [];

    typeDef.directives?.forEach(dir => {
      if (dir.name.value === 'key') {
        keyDirs.push(dir);
      } else {
        otherDirs.push(dir);
      }
    });

    if (!keyDirs.length) return;

    // Setup stitching MergedTypeConfig for all federated entities:
    const selectionSet = `{ ${keyDirs.map((dir: any) => dir.arguments[0].value.value).join(' ')} }`;
    const keyFields = (parse(selectionSet).definitions[0] as any).selectionSet.selections.map(
      (sel: any) => sel.name.value
    );
    const keyDir = keyDirs[0];
    (keyDir.name.value as string) = stitchingConfig.keyDirective.name;

    (keyDir.arguments as any)[0].name.value = 'selectionSet';
    (keyDir.arguments as any)[0].value.value = selectionSet;
    (typeDef.directives as any[]) = [keyDir, ...otherDirs];

    // Remove non-key "@external" fields from the type...
    // the stitching query planner expects services to only publish their own fields.
    // This makes "@provides" moot because the query planner can automate the logic.
    (typeDef.fields as any) = typeDef.fields?.filter(fieldDef => {
      return (
        keyFields.includes(fieldDef.name.value) || !fieldDef.directives?.find(dir => dir.name.value === 'external')
      );
    });

    // Discard remaining "@external" directives and any "@provides" directives
    typeDef.fields?.forEach((fieldDef: any) => {
      fieldDef.directives = fieldDef.directives.filter((dir: any) => !/^(external|provides)$/.test(dir.name.value));
      fieldDef.directives.forEach((dir: any) => {
        if (dir.name.value === 'requires') {
          dir.name.value = stitchingConfig.computedDirective.name;
          dir.arguments[0].name.value = 'selectionSet';
          dir.arguments[0].value.value = `{ ${dir.arguments[0].value.value} }`;
        }
      });
    });

    if (typeDef.kind === Kind.OBJECT_TYPE_DEFINITION || typeDef.kind === Kind.OBJECT_TYPE_EXTENSION) {
      entityTypes.push(typeDef.name.value);
    }
  });

  // Federation service SDLs are incomplete because they omit the federation spec itself...
  // (https://www.apollographql.com/docs/federation/federation-spec/#federation-schema-specification)
  // To make federation SDLs into valid and parsable GraphQL schemas,
  // we must fill in the missing details from the specification.
  if (entityTypes.length) {
    const queryDef = getQueryTypeDef(doc.definitions);
    const entitiesSchema = parse(/* GraphQL */ `
      scalar _Any
      union _Entity = ${entityTypes.filter((v, i, a) => a.indexOf(v) === i).join(' | ')}
      type Query { _entities(representations: [_Any!]!): [_Entity]! @${stitchingConfig.mergeDirective.name} }
    `).definitions as unknown as DefinitionNode & { fields: any[] };

    (doc.definitions as any).push(entitiesSchema[0]);
    (doc.definitions as any).push(entitiesSchema[1]);

    if (queryDef) {
      (queryDef.fields as any).push(entitiesSchema[2].fields[0]);
    } else {
      (doc.definitions as any).push(entitiesSchema[2]);
    }
  }

  return [stitchingConfig.stitchingDirectivesTypeDefs, print(doc)].join('\n');
}
