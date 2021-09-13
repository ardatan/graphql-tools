/**
 * @internal
 */
export declare function isMockList(obj: any): obj is MockList;
/**
 * This is an object you can return from your mock resolvers which calls the
 * provided `mockFunction` once for each list item.
 */
export declare class MockList {
  private readonly len;
  private readonly wrappedFunction;
  /**
   * @param length Either the exact length of items to return or an inclusive
   * range of possible lengths.
   * @param mockFunction The function to call for each item in the list to
   * resolve it. It can return another MockList or a value.
   */
  constructor(length: number | Array<number>, mockFunction?: () => unknown);
  /**
   * @internal
   */
  mock(): unknown[];
  private randint;
}
export declare function deepResolveMockList(mockList: MockList): unknown[];
