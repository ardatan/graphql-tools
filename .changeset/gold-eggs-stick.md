---
'@graphql-tools/utils': minor
---

Add default values to the arguments

When the schema is like following;

```graphql
type Query {
    getAllPages(currentPage: Int = 0, pageSize: Int = 10, pageType: getAllPages_pageType = ContentPage, sort: String = "asc"): PagesList
}

enum getAllPages_pageType {
    ContentPage
    CategoryPage
    CatalogPage
}

type PagesList {
    ...
}
```

The generated operation will be like following;

```graphql
query getAllPages_query($currentPage: Int = 0, $pageSize: Int = 10, $pageType: getAllPages_pageType = ContentPage, $sort: String = "asc") {
    getAllPages(currentPage: $currentPage, pageSize: $pageSize, pageType: $pageType, sort: $sort) {
        ...
    }
}
```
