import { Kind } from 'graphql';
export function getDocumentMetadata(document) {
    var operations = [];
    var fragments = [];
    var fragmentNames = new Set();
    for (var i = 0; i < document.definitions.length; i++) {
        var def = document.definitions[i];
        if (def.kind === Kind.FRAGMENT_DEFINITION) {
            fragments.push(def);
            fragmentNames.add(def.name.value);
        }
        else if (def.kind === Kind.OPERATION_DEFINITION) {
            operations.push(def);
        }
    }
    return {
        operations: operations,
        fragments: fragments,
        fragmentNames: fragmentNames,
    };
}
