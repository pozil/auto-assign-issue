const {
    runAction,
    pickNRandomFromArray,
    getTeamMembers
} = require('../action.js');

const TEAMS_MEMBERS = {
    teamA: { data: [{ login: 'userA1' }, { login: 'userA2' }] },
    teamB: { data: [{ login: 'userB1' }] }
};
const CONTEXT_PAYLOAD = {
    repository: { full_name: 'mockOrg/mockRepo' },
    issue: { number: 666 }
};
const PR_CONTEXT_PAYLOAD = {
    repository: { full_name: 'mockOrg/mockRepo' },
    issue: { number: 667 }
};

const PROJECT_CONTEXT_PAYLOAD = {
    repository: { full_name: 'mockOrgCard/mockRepoCard' },
    event: {
        project_card: {
            content_url:
                'https://github.com/mockOrgCard/mockRepoCard/issues/668'
        }
    }
};

// Mock Octokit
const assignUsersToIssueMock = jest.fn(() => Promise.resolve());
const removeUsersFromIssueMock = jest.fn(() => Promise.resolve());
const listTeamMembersMock = jest.fn((params) =>
    Promise.resolve(TEAMS_MEMBERS[params.team_slug])
);
const octokitMock = {
    rest: {
        teams: { listMembersInOrg: listTeamMembersMock },
        issues: {
            addAssignees: assignUsersToIssueMock,
            removeAssignees: removeUsersFromIssueMock
        }
    }
};

describe('action', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('pickNRandomFromArray', () => {
        it('works when selection size < array length', () => {
            const result = pickNRandomFromArray([1, 2, 3, 4], 2);
            expect(result.length).toBe(2);
        });

        it('works when selection size > array length', () => {
            const result = pickNRandomFromArray([1, 2, 3, 4], 5);
            expect(result.length).toBe(4);
        });

        it('fails when array is empty', () => {
            expect(() => pickNRandomFromArray([], 2)).toThrow(/empty list/);
        });
    });

    describe('getTeamMembers', () => {
        it('works with multiple teams', async () => {
            const org = 'myOrg';
            const teamNames = ['teamA', 'teamB'];

            const teamMembers = await getTeamMembers(
                octokitMock,
                org,
                teamNames
            );

            expect(listTeamMembersMock).toHaveBeenCalledTimes(teamNames.length);
            expect(listTeamMembersMock).toHaveBeenNthCalledWith(1, {
                org,
                team_slug: teamNames[0]
            });
            expect(listTeamMembersMock).toHaveBeenNthCalledWith(2, {
                org,
                team_slug: teamNames[1]
            });
            expect(teamMembers).toStrictEqual(['userA1', 'userA2', 'userB1']);
        });
    });

    describe('runAction', () => {
        it('fails when missing issue from context', async () => {
            expect(runAction(null, {}, null, null, 1)).rejects.toThrow(
                /find issue/
            );
        });

        it('fails when missing both assigneesString and teams inputs', async () => {
            expect(
                runAction(null, CONTEXT_PAYLOAD, null, null, 1)
            ).rejects.toThrow(/required paramters/);
        });

        it('fails when numOfAssigneeString input is not a number', async () => {
            expect(
                runAction(null, CONTEXT_PAYLOAD, 'someValue', null, 'invalid')
            ).rejects.toThrow(/Invalid numOfAssignee/);
        });

        it('works with asignees only, no random pick', async () => {
            await runAction(
                octokitMock,
                CONTEXT_PAYLOAD,
                'user1,user2',
                null,
                null
            );

            expect(listTeamMembersMock).not.toHaveBeenCalled();
            expect(removeUsersFromIssueMock).not.toHaveBeenCalled();
            expect(assignUsersToIssueMock).toHaveBeenCalledTimes(1);
            expect(assignUsersToIssueMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: 666,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with teams only, no random pick', async () => {
            await runAction(
                octokitMock,
                CONTEXT_PAYLOAD,
                null,
                'teamA,teamB',
                null
            );

            expect(listTeamMembersMock).toHaveBeenCalledTimes(2);
            expect(assignUsersToIssueMock).toHaveBeenCalledTimes(1);
            expect(assignUsersToIssueMock).toHaveBeenCalledWith({
                assignees: ['userA1', 'userA2', 'userB1'],
                issue_number: 666,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with assignees and teams with duplicates, no random pick', async () => {
            await runAction(
                octokitMock,
                CONTEXT_PAYLOAD,
                'user1,user2,userA2',
                'teamA,teamB',
                null
            );

            expect(assignUsersToIssueMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2', 'userA2', 'userA1', 'userB1'],
                issue_number: 666,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with assignees, random pick', async () => {
            await runAction(
                octokitMock,
                CONTEXT_PAYLOAD,
                'user1,user2,userA2',
                null,
                2
            );

            expect(
                assignUsersToIssueMock.mock.calls[0][0].assignees.length
            ).toBe(2);
        });

        it('works with teams, random pick', async () => {
            await runAction(
                octokitMock,
                CONTEXT_PAYLOAD,
                null,
                'teamA,teamB',
                2
            );

            expect(
                assignUsersToIssueMock.mock.calls[0][0].assignees.length
            ).toBe(2);
        });

        it('works with pull requests', async () => {
            await runAction(
                octokitMock,
                PR_CONTEXT_PAYLOAD,
                'user1,user2',
                null,
                null
            );

            expect(listTeamMembersMock).not.toHaveBeenCalled();
            expect(assignUsersToIssueMock).toHaveBeenCalledTimes(1);
            expect(assignUsersToIssueMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: 667,
                owner: 'mockOrg',
                repo: 'mockRepo'
            });
        });

        it('works with project card events', async () => {
            await runAction(
                octokitMock,
                PROJECT_CONTEXT_PAYLOAD,
                'user1,user2',
                null,
                null
            );

            expect(assignUsersToIssueMock).toHaveBeenCalled();
            expect(assignUsersToIssueMock).toHaveBeenCalledWith({
                assignees: ['user1', 'user2'],
                issue_number: 668,
                owner: 'mockOrgCard',
                repo: 'mockRepoCard'
            });
        });

        it('removes previous assignees', async () => {
            await runAction(
                octokitMock,
                CONTEXT_PAYLOAD,
                'user1,user2,userA2',
                null,
                null,
                true
            );

            expect(removeUsersFromIssueMock).toHaveBeenCalled();
        });
    });
});
