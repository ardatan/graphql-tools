import { getCustomLoaderByPath, getCustomLoaderByPathSync } from "../src/utils/custom-loader"

describe('getCustomLoaderByPath', () => {
  it("async - can load a custom loader from a file path", async () => {
    const loader = await getCustomLoaderByPath("./custom-loader.js", __dirname)
    expect(loader).toBeDefined()
    expect(loader()).toEqual("I like turtles")
  })
  it("sync - can load a custom loader from a file path", async () => {
    const loader = getCustomLoaderByPathSync("./custom-loader.js", __dirname)
    expect(loader).toBeDefined()
    expect(loader()).toEqual("I like turtles")
  })
})
