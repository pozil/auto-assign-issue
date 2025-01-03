const { runAction } = require('../action.js');
const {
    getOctokitMock,
    defaultRemoveIssueAssigneesMock,
    defaultAddIssueAssigneesMock,
    defaultGetIssueMock,
    defaultAddPRReviewersMock,
    defaultListTeamMembersMock
} = require('./utils/octokitMock.js');

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

const listTeamMembersMock = jest.fn((params) =>
    Promise.resolve(TEAM_MEMBERS[params.team_slug])
);

describe('action', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('issues', () => {
        it('fails when missing issue from context', async () => {
            await expect(
                runAction(
                    getOctokitMock(),
                    { repository: { full_name: 'mockOrg/mockRepo' } },
                    { assignees: ['author'] }
                )
            ).rejects.toThrow(/find issue/);
        });

        it('fails when missing both assignees and teams inputs', async () => {
            await expect(
                runAction(getOctokitMock(), ISSUE_CONTEXT_PAYLOAD, {})
            ).rejects.toThrow(/required parameters/);
        });

        it('fails when allowSelfAssign is false and there are no candidates', async () => {
            await expect(
                runAction(getOctokitMock(), ISSUE_CONTEXT_PAYLOAD, {
                    assignees: ['author'],
                    allowSelfAssign: false
                })
            ).rejects.toThrow(/No candidates found/);
        });

        it('aborts when abortIfPreviousAssignees is true and there are previous assignees', async () => {
            await runAction(getOctokitMock(), ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['author'],
                abortIfPreviousAssignees: true
            });

            expect(defaultRemoveIssueAssigneesMock).not.toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).not.toHaveBeenCalled();
        });

        it('works when issue number is passed manually', async () => {
            const context = {
                repository: { full_name: 'mockOrg/mockRepo' }
            };
            const parameters = {
                assignees: ['author'],
                manualIssueNumber: 123123
            };

            await runAction(getOctokitMock(), context, parameters);

            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                owner: context.repository.full_name.split('/')[0],
                repo: context.repository.full_name.split('/')[1],
                issue_number: parameters.manualIssueNumber,
                assignees: parameters.assignees
            });
        });

        it('works when allowNoAssignees is true and there are no candidates', async () => {
            await runAction(getOctokitMock(), ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['author'],
                allowNoAssignees: true,
                allowSelfAssign: false
            });

            expect(defaultListTeamMembersMock).not.toHaveBeenCalled();
            expect(defaultRemoveIssueAssigneesMock).not.toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).not.toHaveBeenCalled();
        });

        it('works with self assigned issue', async () => {
            await runAction(getOctokitMock(), ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['author']
            });

            expect(defaultListTeamMembersMock).not.toHaveBeenCalled();
            expect(defaultRemoveIssueAssigneesMock).not.toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['author'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with static assignees only', async () => {
            await runAction(getOctokitMock(), ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2']
            });

            expect(defaultListTeamMembersMock).not.toHaveBeenCalled();
            expect(defaultRemoveIssueAssigneesMock).not.toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with static teams only', async () => {
            const octokitMock = getOctokitMock({ listTeamMembersMock });

            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                teams: ['teamA', 'teamB']
            });

            expect(listTeamMembersMock).toHaveBeenCalledTimes(2);
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['userA1', 'userA2', 'userB1'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with static assignees and teams with duplicates', async () => {
            const octokitMock = getOctokitMock({ listTeamMembersMock });

            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2', 'userA2'],
                teams: ['teamA', 'teamB']
            });

            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2', 'userA2', 'userA1', 'userB1'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with random assignees', async () => {
            await runAction(getOctokitMock(), ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2', 'userA2'],
                numOfAssignee: 2
            });

            expect(
                defaultAddIssueAssigneesMock.mock.calls[0][0].assignees.length
            ).toBe(2);
        });

        it('works with teams, random assignee', async () => {
            const octokitMock = getOctokitMock({ listTeamMembersMock });

            await runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                teams: ['teamA', 'teamB'],
                numOfAssignee: 2
            });

            expect(
                defaultAddIssueAssigneesMock.mock.calls[0][0].assignees.length
            ).toBe(2);
        });

        it('removes previous assignees', async () => {
            await runAction(getOctokitMock(), ISSUE_CONTEXT_PAYLOAD, {
                assignees: ['user1'],
                removePreviousAssignees: true
            });

            expect(defaultGetIssueMock).toHaveBeenCalled();
            expect(defaultRemoveIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['userA', 'userB'],
                issue_number: ISSUE_CONTEXT_PAYLOAD.issue.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('fails if user cannot be assigned and failsIfUsersCannotBeAssigned flag is true', async () => {
            const requestMock = jest.fn(() => Promise.reject({ status: 404 }));
            const octokitMock = getOctokitMock({ requestMock });

            await expect(
                runAction(octokitMock, ISSUE_CONTEXT_PAYLOAD, {
                    assignees: ['userA'],
                    failsIfUsersCannotBeAssigned: true
                })
            ).rejects.toThrow(/can't be assigned/);
        });
    });

    describe('PRs', () => {
        it('works with pull requests', async () => {
            await runAction(getOctokitMock(), PR_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2']
            });

            expect(defaultListTeamMembersMock).not.toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
            expect(defaultAddPRReviewersMock).toHaveBeenCalledTimes(1);
            expect(defaultAddPRReviewersMock).toHaveBeenCalledWith({
                reviewers: ['user1', 'user2'],
                pull_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('removes previous PR reviewers', async () => {
            await runAction(getOctokitMock(), PR_CONTEXT_PAYLOAD, {
                assignees: ['user1'],
                removePreviousAssignees: true
            });

            expect(defaultGetIssueMock).toHaveBeenCalled();
            expect(defaultRemoveIssueAssigneesMock).toHaveBeenCalledWith({
                owner: 'mockOrg',
                repo: 'mockRepo',
                issue_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                assignees: ['userA', 'userB']
            });
        });

        it('assigns author to pull request assignee', async () => {
            await runAction(getOctokitMock(), PR_CONTEXT_PAYLOAD, {
                assignees: ['author', 'user1'],
                allowSelfAssign: true
            });

            expect(defaultListTeamMembersMock).not.toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['author', 'user1'],
                issue_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('does not assigns author as PR reviewer', async () => {
            await runAction(getOctokitMock(), PR_CONTEXT_PAYLOAD, {
                assignees: ['author', 'user1', 'user2'],
                allowSelfAssign: true
            });

            expect(defaultAddPRReviewersMock).toHaveBeenCalledTimes(1);
            expect(defaultAddPRReviewersMock).toHaveBeenCalledWith({
                reviewers: ['user1', 'user2'],
                pull_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with team reviewer for pull request', async () => {
            const octokitMock = getOctokitMock({ listTeamMembersMock });

            await runAction(octokitMock, PR_CONTEXT_PAYLOAD, {
                teams: ['teamA'],
                teamIsPullRequestReviewer: true
            });

            expect(listTeamMembersMock).toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['userA1', 'userA2'],
                issue_number: PR_CONTEXT_PAYLOAD.pull_request.number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with random reviewers from teams', async () => {
            const octokitMock = getOctokitMock({ listTeamMembersMock });

            await runAction(octokitMock, PR_CONTEXT_PAYLOAD, {
                teams: ['teamA'],
                numOfAssignee: 1
            });

            // Check that we only assign one users out of the team
            expect(defaultAddPRReviewersMock).toHaveBeenCalledTimes(1);
            const { reviewers } = defaultAddPRReviewersMock.mock.calls[0][0];
            expect(reviewers.length).toBe(1);
            const reviewer = reviewers[0];
            expect(
                TEAM_MEMBERS.teamA.data.some((user) => user.login === reviewer)
            ).toBeTruthy();
        });
    });

    describe('Project Cards', () => {
        it('works with project card events (for issues)', async () => {
            await runAction(getOctokitMock(), PROJECT_CONTEXT_PAYLOAD, {
                assignees: ['user1', 'user2']
            });

            expect(defaultAddIssueAssigneesMock).toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: 669,
                owner: 'mockOrgCard',
                repo: 'mockRepoCard'
            });
        });
    });

    describe('PRs in workflow run', () => {
        it('assigns author as PR assignee from workflow_run', async () => {
            await runAction(getOctokitMock(), WORKFLOW_RUN_CONTEXT_PAYLOAD, {
                assignees: ['author', 'user2'],
                allowSelfAssign: true
            });

            expect(defaultListTeamMembersMock).not.toHaveBeenCalled();
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledTimes(1);
            expect(defaultAddIssueAssigneesMock).toHaveBeenCalledWith({
                assignees: ['author', 'user2'],
                issue_number:
                    WORKFLOW_RUN_CONTEXT_PAYLOAD.workflow_run.pull_requests[0]
                        .number,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('does not assigns author as PR reviewer from workflow_run', async () => {
            await runAction(getOctokitMock(), WORKFLOW_RUN_CONTEXT_PAYLOAD, {
                assignees: ['author', 'user1', 'user2'],
                allowSelfAssign: true
            });

            expect(defaultAddPRReviewersMock).toHaveBeenCalledTimes(1);
            expect(defaultAddPRReviewersMock).toHaveBeenCalledWith({
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
