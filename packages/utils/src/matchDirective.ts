import { DirectiveNode, ArgumentNode } from 'graphql';

export function matchDirective(
  directive: DirectiveNode,
  requiredName: string,
  requiredArgs: Record<string, any> = {}
): boolean {
  if (directive.name.value === requiredName) {
    const requiredArgNames = Object.keys(requiredArgs);

    if (requiredArgNames.length) {
      const argsMap: Record<string, any> = Object.create(null);
      directive.arguments.forEach((arg: ArgumentNode) => {
        argsMap[arg.name.value] = 'value' in arg.value ? arg.value.value : undefined;
      });
      return requiredArgNames.every(name => requiredArgs[name] === argsMap[name]);
    }
    return true;
  }
  return false;
}
