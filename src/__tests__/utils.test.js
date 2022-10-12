const {
    parseIntInput,
    parseCsvInput,
    pickNRandomFromArray,
    getTeamMembers
} = require('../utils.js');

const TEAM_MEMBERS = {
    teamA: { data: [{ login: 'userA1' }, { login: 'userA2' }] },
    teamB: { data: [{ login: 'userB1' }] }
};

// Mock Octokit
const listTeamMembersMock = jest.fn((params) =>
    Promise.resolve(TEAM_MEMBERS[params.team_slug])
);
const octokitMock = {
    rest: {
        teams: { listMembersInOrg: listTeamMembersMock }
    }
};

describe('utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('parseIntInput', () => {
        it('works when value is a number', async () => {
            expect(parseIntInput('3', 0)).toBe(3);
        });

        it('returns default value when value is missing', async () => {
            expect(parseIntInput('', 6)).toBe(6);
        });

        it('fails when value is not a number', async () => {
            expect(() => parseIntInput('invalid', 0)).toThrow(
                /Invalid integer value/
            );
        });
    });

    describe('parseCsvInput', () => {
        it('works when value is a CSV', async () => {
            expect(parseCsvInput('1,2,3')).toStrictEqual(['1', '2', '3']);
        });

        it('works when value is missing', async () => {
            expect(parseCsvInput('')).toStrictEqual([]);
        });

        it('works with some missing values and whitespace', async () => {
            expect(parseCsvInput(',1 ,, , 2,3,,')).toStrictEqual([
                '1',
                '2',
                '3'
            ]);
        });
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
});
