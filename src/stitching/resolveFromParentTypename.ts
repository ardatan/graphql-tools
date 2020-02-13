export default function resolveFromParentTypename(parent: any) {
  const parentTypename: string = parent['__typename'];
  if (!parentTypename) {
    throw new Error(
      'Did not fetch typename for object, unable to resolve interface.',
    );
  }

  return parentTypename;
}
