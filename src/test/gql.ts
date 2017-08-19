export default function gql(strings: TemplateStringsArray, ...rest: any[]) {
  if (rest) {
    throw new Error('No interpolations allowed.');
  }

  return strings.join('');
}
