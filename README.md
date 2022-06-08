# GitHub action that auto-assigns issues to users or team members

[![CI Workflow](https://github.com/pozil/auto-assign-issue/workflows/CI/badge.svg)](https://github.com/pozil/auto-assign-issue/actions?query=workflow%3ACI) [![codecov](https://codecov.io/gh/pozil/auto-assign-issue/branch/master/graph/badge.svg)](https://codecov.io/gh/pozil/auto-assign-issue) [![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Auto%20Assign%20Issue-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/auto-assign-issue)

## Inputs

| Parameter                 | Type    | Required                             | Description                                                                                                                                                                                                                                                    |
| ------------------------- | ------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assignees`               | String  | only if `teams` is not specified     | Comma separated list of user names. Issue will be assigned to those users.                                                                                                                                                                                     |
| `teams`                   | String  | only if `assignees` is not specified | Comma separated list of teams. Issue will be assigned to the team members.<br/><br/>**Important Requirement:** if using the `teams` input parameter, you need to use a personal access token with `read:org` scope (the default `GITHUB_TOKEN` is not enough). |
| `numOfAssignee`           | Number  | false                                | Number of assignees that will be randomly picked from the teams or assignees. If not specified, assigns all users.                                                                                                                                             |
| `removePreviousAssignees` | Boolean | false                                | Flag that removes assignees before assigning them (useful the issue is reasigned). False by default.                                                                                                                                                           |
| `allowSelfAssign`         | Boolean | false                                | Flag that allows self-assignment to the issue author. True by default.                                                                                                                                                                                         |

## Examples

Here's an example flow that auto-assigns all new issues to two users randomly chosen from `octocat`, `cat` and `dog` :

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
                  assignees: octocat,cat,dog
                  numOfAssignee: 2
```

This other configuration assigns issues to a random member of the `support` team:

```yml
- name: 'Auto-assign issue'
    uses: pozil/auto-assign-issue@v1
    with:
        repo-token: ${{ secrets.MY_PERSONAL_ACCESS_TOKEN }}
        teams: support
        numOfAssignee: 1
```

### Specifying a dynamic user

Instead of hardcoding the user name in the workflow, you can use a secret:

-   create a GitHub secret named `DEFAULT_ISSUE_ASSIGNEE` with the name of the user
-   use this value `${{ secrets.DEFAULT_ISSUE_ASSIGNEE }}` instead of the username in the workflow.
