---
'@graphql-tools/github-loader': patch
---

Fix Github loader responding with 401 with invalid credentials

Running the GitHub loader on a private repository with a missing or invalid GitHub token masks the real error as [object Object].
This happens because the GitHub GraphQL api returns 401 unauthorized if the token is not valid.
After some debugging the only http status code i could find that triggers this is 401.
With the returned payload being:

This update fixes the problem for 401 by passing status to `handleResponse` and checking if that is 401 and reporting the correct message returned from Github.
The response from github being:

```
{"message":"Bad credentials","documentation_url":"https://docs.github.com/graphql"}
```
