# GitHub action that auto-assigns issues to a team or user

```yml
name: Issue assignment

on:
    issues:
        types: [opened]

jobs:
    auto-assign:
        runs-on: ubuntu-latest
        steps:
            - name: 'Auto-assign issue'
              uses: pozil/auto-assign-issue@v1
              with:
                  repo-token: ${{ secrets.GITHUB_TOKEN }}
                  user: pozil
```
