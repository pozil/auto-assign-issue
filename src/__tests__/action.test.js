const { runAction } = require('../action.js');

const TEAM_MEMBERS = {
    teamA: { data: [{ login: 'userA1' }, { login: 'userA2' }] },
    teamB: { data: [{ login: 'userB1' }] }
};

const ISSUE_CONTEXT_PAYLOAD = {
    repository: { full_name: 'mockOrg/mockRepo' },
    issue: {
        number: 666,
        user: { login: 'author' }
    }
};
const PR_CONTEXT_PAYLOAD = {
    repository: { full_name: 'mockOrg/mockRepo' },
    pull_request: {
        number: 667,
        user: { login: 'author' }
    }
};
const WORKFLOW_RUN_CONTEXT_PAYLOAD = {
    repository: { full_name: 'mockOrg/mockRepo' },
    workflow_run: {
        pull_requests: [
            {
                number: 668
            }
        ],
        actor: { login: 'author' }
    }
};
const PROJECT_CONTEXT_PAYLOAD = {
    repository: { full_name: 'mockOrgCard/mockRepoCard' },
    project_card: {
        content_url: 'https://github.com/mockOrgCard/mockRepoCard/issues/669'
    }
};

// Mock Octokit
const getIssueMock = jest.fn(() =>
    Promise.resolve({
        data: { assignees: [{ login: 'userA' }, { login: 'userB' }] }
    })
);
const getPRMock = jest.fn(() =>
    Promise.resolve({
        data: {
            assignees: [{ login: 'userA' }, { login: 'userB' }],
            requested_reviewers: [{ login: 'userA' }, { login: 'userB' }]
        }
    })
);
const addIssueAssigneesMock = jest.fn(() => Promise.resolve());
const removeIssueAssigneesMock = jest.fn(() => Promise.resolve());
const addPRReviewersMock = jest.fn(() => Promise.resolve());
const removePRReviewersMock = jest.fn(() => Promise.resolve());
const listTeamMembersMock = jest.fn((params) =>
    Promise.resolve(TEAM_MEMBERS[params.team_slug])
);
const octokitMock = {
    rest: {
        teams: { listMembersInOrg: listTeamMembersMock },
        issues: {
            get: getIssueMock,
            addAssignees: addIssueAssigneesMock,
            removeAssignees: removeIssueAssigneesMock
        },
        pulls: {
            get: getPRMock,
            requestReviewers: addPRReviewersMock,
            removeRequestedReviewers: removePRReviewersMock
        }
    }
};

describe('action', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('issues', () => {
        it('fails when missing issue from context', async () => {
            await expect(
                runAction(
                    octokitMock,
                    { repository: { full_name: 'mockOrg/mockRepo' } },
                    { assignees: ['author'] }
                )
            ).rejects.toThrow(/find issue/);
        });

        it('fails when missing both assignees and teams inputs', async () => {
            await expect(
                runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {})
            ).rejects.toThrow(/required parameters/);
        });

        it('fails when allowSelfAssign is false and there are no candidates', async () => {
            await expect(
                runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                    assignees: ['author'],
                    allowSelfAssign: false
                })
            ).rejects.toThrow(/No candidates found/);
        });

        it('aborts when abortIfPreviousAssignees is true and there are previous assignees', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['author'],
                abortIfPreviousAssignees: true
            });

            expect(removeIssueAssigneesMock).not.toHaveBeenCalled();
            expect(addIssueAssigneesMock).not.toHaveBeenCalled();
        });

        it('works when issue number is passed manually', async () => {
            const context = {
                repository: { full_name: 'mockOrg/mockRepo' }
            };
            const parameters = {
                assignees: ['author'],
                manualIssueNumber: 123123
            };

            await runAction(octokitMock, context, parameters);

            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                owner: context.repository.full_name.split('/')[0],
                repo: context.repository.full_name.split('/')[1],
                issue_number: parameters.manualIssueNumber,
                assignees: parameters.assignees
            });
        });

        it('works when allowNoAssignees is true and there are no candidates', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['author'],
                allowNoAssignees: true,
                allowSelfAssign: false
            });

            expect(listTeamMembersMock).not.toHaveBeenCalled();
            expect(removeIssueAssigneesMock).not.toHaveBeenCalled();
            expect(addIssueAssigneesMock).not.toHaveBeenCalled();
        });

        it('works with self assigned issue', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['author']
            });

            expect(listTeamMembersMock).not.toHaveBeenCalled();
            expect(removeIssueAssigneesMock).not.toHaveBeenCalled();
            expect(addIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['author'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with assignees only, no random pick', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2']
            });

            expect(listTeamMembersMock).not.toHaveBeenCalled();
            expect(removeIssueAssigneesMock).not.toHaveBeenCalled();
            expect(addIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with teams only, no random pick', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                teams: ['teamA', 'teamB']
            });

            expect(listTeamMembersMock).toHaveBeenCalledTimes(2);
            expect(addIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['userA1', 'userA2', 'userB1'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with assignees and teams with duplicates, no random pick', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2', 'userA2'],
                teams: ['teamA', 'teamB']
            });

            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2', 'userA2', 'userA1', 'userB1'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with assignees, random pick', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2', 'userA2'],
                numOfAssignee: 2
            });

            expect(
                addIssueAssigneesMock.mock.calls[0][0].assignees.length
            ).toBe(2);
        });

        it('works with teams, random pick', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                teams: ['teamA', 'teamB'],
                numOfAssignee: 2
            });

            expect(
                addIssueAssigneesMock.mock.calls[0][0].assignees.length
            ).toBe(2);
        });

        it('removes previous assignees', async () => {
            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['user1'],
                removePreviousAssignees: true
            });

            expect(getIssueMock).toHaveBeenCalled();
            expect(removeIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['userA', 'userB'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });
    });

    describe('PRs', () => {
        it('works with pull requests', async () => {
            await runAction(octokitMock, PR_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2']
            });

            expect(listTeamMembersMock).not.toHaveBeenCalled();
            expect(addIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
            expect(addPRReviewersMock).toHaveBeenCalledTimes(1);
            expect(addPRReviewersMock).toHaveBeenCalledWith({
                reviewers: ['user1', 'user2'],
                pull_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('removes previous PR reviewers', async () => {
            await runAction(octokitMock, PR_CONTEXT_PAYLOAD, {
                assignees: ['user1'],
                removePreviousAssignees: true
            });

            expect(getIssueMock).toHaveBeenCalled();
            expect(removeIssueAssigneesMock).toHaveBeenCalledWith({
                owner: 'mockOrg',
                repo: 'mockRepo',
                issue_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                assignees: ['userA', 'userB']
            });
        });

        it('assigns author to pull request assignee', async () => {
            await runAction(octokitMock, PR_CONTEXT_PAYLOAD, {
                assignees: ['author', 'user1'],
                allowSelfAssign: true
            });

            expect(listTeamMembersMock).not.toHaveBeenCalled();
            expect(addIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['author', 'user1'],
                issue_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('does not assigns author as PR reviewer', async () => {
            await runAction(octokitMock, PR_CONTEXT_PAYLOAD, {
                assignees: ['author', 'user1', 'user2'],
                allowSelfAssign: true
            });

            expect(addPRReviewersMock).toHaveBeenCalledTimes(1);
            expect(addPRReviewersMock).toHaveBeenCalledWith({
                reviewers: ['user1', 'user2'],
                pull_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });
    });

    describe('Project Cards', () => {
        it('works with project card events (for issues)', async () => {
            await runAction(octokitMock, PROJECT_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2']
            });

            expect(addIssueAssigneesMock).toHaveBeenCalled();
            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: 669,
                owner: 'mockOrgCard',
                repo: 'mockRepoCard'
            });
        });
    });

    describe('PRs in workflow run', () => {
        it('assigns author as PR assignee from workflow_run', async () => {
            await runAction(octokitMock, WORKFLOW_RUN_CONTEXT_PAYLOAD, {
                assignees: ['author', 'user2'],
                allowSelfAssign: true
            });

            expect(listTeamMembersMock).not.toHaveBeenCalled();
            expect(addIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(addIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['author', 'user2'],
                issue_number:
                    WORKFLOW_RUN_CONTEXT_PAYLOAD.workflow_run.pull_requests[0]
                        .number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('does not assigns author as PR reviewer from workflow_run', async () => {
            await runAction(octokitMock, WORKFLOW_RUN_CONTEXT_PAYLOAD, {
                assignees: ['author', 'user1', 'user2'],
                allowSelfAssign: true
            });

            expect(addPRReviewersMock).toHaveBeenCalledTimes(1);
            expect(addPRReviewersMock).toHaveBeenCalledWith({
                reviewers: ['user1', 'user2'],
                pull_number:
                    WORKFLOW_RUN_CONTEXT_PAYLOAD.workflow_run.pull_requests[0]
                        .number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });
    });
});
