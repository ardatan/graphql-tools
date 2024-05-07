import { FieldNode, Kind, SelectionNode, SelectionSetNode } from 'graphql';

export class SelectionSetBuilder {
  fieldNodeMap = new Map<string, FieldNode>();
  fieldSelections = new Map<string, SelectionSetBuilder>();
  fragmentSpreads = new Set<string>();
  inlineFragments = new Map<string, SelectionSetBuilder>();
  constructor() {}
  addSelection(selection: SelectionNode) {
    switch (selection.kind) {
      case Kind.FRAGMENT_SPREAD: {
        this.fragmentSpreads.add(selection.name.value);
        break;
      }
      case Kind.INLINE_FRAGMENT: {
        if (!selection.typeCondition) {
          for (const subSelection of selection.selectionSet.selections) {
            this.addSelection(subSelection);
          }
          break;
        }
        let inlineFragmentBuilder = this.inlineFragments.get(selection.typeCondition.name.value);
        if (!inlineFragmentBuilder) {
          inlineFragmentBuilder = new SelectionSetBuilder();
          this.inlineFragments.set(selection.typeCondition.name.value, inlineFragmentBuilder);
        }
        for (const subSelection of selection.selectionSet.selections) {
          if (subSelection.kind === Kind.FIELD && this.fieldNodeMap.has(subSelection.name.value)) {
            if (subSelection.selectionSet) {
              let fieldSelections = this.fieldSelections.get(subSelection.name.value);
              if (!fieldSelections) {
                fieldSelections = new SelectionSetBuilder();
                this.fieldSelections.set(subSelection.name.value, fieldSelections);
              }
              for (const subSubSelection of subSelection.selectionSet.selections) {
                fieldSelections.addSelection(subSubSelection);
              }
            }
            continue;
          }
          inlineFragmentBuilder.addSelection(subSelection);
        }
        break;
      }
      case Kind.FIELD: {
        const responseKey = selection.alias?.value || selection.name.value;
        this.fieldNodeMap.set(responseKey, selection);
        let fieldSelections = this.fieldSelections.get(responseKey);
        if (!fieldSelections) {
          fieldSelections = new SelectionSetBuilder();
          this.fieldSelections.set(responseKey, fieldSelections);
        }
        if (selection.selectionSet) {
          for (const subSelection of selection.selectionSet.selections) {
            fieldSelections.addSelection(subSelection);
          }
        }
        break;
      }
    }
  }

  getSelectionSet(): SelectionSetNode {
    const selections: SelectionNode[] = [];
    for (const fieldNode of this.fieldNodeMap.values()) {
      selections.push(fieldNode);
    }
    for (const fragmentSpread of this.fragmentSpreads) {
      selections.push({
        kind: Kind.FRAGMENT_SPREAD,
        name: {
          kind: Kind.NAME,
          value: fragmentSpread,
        },
      });
    }
    for (const [typeName, inlineFragmentBuilder] of this.inlineFragments) {
      if (inlineFragmentBuilder.getSize() > 0) {
        selections.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: typeName,
            },
          },
          selectionSet: inlineFragmentBuilder.getSelectionSet(),
        });
      }
    }
    return {
      kind: Kind.SELECTION_SET,
      selections,
    };
  }

  getSize() {
    return this.fieldNodeMap.size + this.fragmentSpreads.size + this.inlineFragments.size;
  }
}
