export default function gql(strings: TemplateStringsArray, ...rest: any[]) {
  const values: any = [];
  rest.forEach((val, i) => {
    values.push(strings[i]);
    values.push(val);
  })
  values.push(strings[strings.length - 1]);
  return values.join('');
}
