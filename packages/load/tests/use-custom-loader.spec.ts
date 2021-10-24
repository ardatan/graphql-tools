import { getCustomLoaderByPath, getCustomLoaderByPathSync } from "../src/utils/custom-loader"

[
  ['async', getCustomLoaderByPath],
  ['sync', getCustomLoaderByPathSync]
].forEach(([prefix, getCustomLoaderByPath]) => {
  describe('getCustomLoaderByPath - ' + prefix, () => {
    it("can load a custom loader from a file path", async () => {
      const loader = await getCustomLoaderByPath("./custom-loader.js", __dirname)
      expect(loader).toBeDefined()
      expect(loader()).toEqual("I like turtles")
    })
    it("can load a custom loader from a file path and export specifier", async () => {
      const loader = await getCustomLoaderByPath("./custom-loader-with-named-export.js#namedExport", __dirname)
      expect(loader).toBeDefined()
      expect(loader()).toEqual("I like turtles")
    })
  })
})
