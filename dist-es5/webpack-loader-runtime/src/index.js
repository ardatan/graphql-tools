export var uniqueCode = "\n  var names = {};\n  function unique(defs) {\n    return defs.filter(function (def) {\n      if (def.kind !== 'FragmentDefinition') return true;\n      var name = def.name.value;\n      if (names[name]) {\n        return false;\n      } else {\n        names[name] = true;\n        return true;\n      }\n    });\n  };\n";
export function useUnique() {
    var names = {};
    return function unique(defs) {
        return defs.filter(function (def) {
            if (def.kind !== 'FragmentDefinition')
                return true;
            var name = def.name.value;
            if (names[name]) {
                return false;
            }
            else {
                names[name] = true;
                return true;
            }
        });
    };
}
