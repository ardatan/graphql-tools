export interface DirectiveExtensionsTarget {
  extensions?: {
    directives?: Record<string, any>;
  } | null;
}

export function addDirectiveExtensions(
  target: DirectiveExtensionsTarget,
  newDirectives: Record<string, any>,
) {
  target.extensions ||= {};
  target.extensions.directives ||= {};
  const targetDirectives = target.extensions.directives;
  for (const directiveName in newDirectives) {
    const existingDirective = targetDirectives[directiveName];
    const newDirective = newDirectives[directiveName];
    if (!existingDirective) {
      targetDirectives[directiveName] = newDirective;
    } else if (Array.isArray(existingDirective)) {
      if (Array.isArray(newDirective)) {
        targetDirectives[directiveName] = existingDirective.concat(newDirective);
      } else {
        targetDirectives[directiveName] = [...existingDirective, newDirective];
      }
    } else {
      if (Array.isArray(newDirective)) {
        targetDirectives[directiveName] = [existingDirective, ...newDirective];
      } else {
        targetDirectives[directiveName] = [existingDirective, newDirective];
      }
    }
  }
}
