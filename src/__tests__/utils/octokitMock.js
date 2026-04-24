import { jest } from '@jest/globals';

const defaultGetIssueMock = jest.fn(() =>
    Promise.resolve({
        data: { assignees: [{ login: 'userA' }, { login: 'userB' }] }
    })
);
const defaultGetPRMock = jest.fn(() =>
    Promise.resolve({
        data: {
            assignees: [{ login: 'userA' }, { login: 'userB' }],
            requested_reviewers: [{ login: 'userA' }, { login: 'userB' }]
        }
    })
);
const defaultAddIssueAssigneesMock = jest.fn(() => Promise.resolve());
const defaultRemoveIssueAssigneesMock = jest.fn(() => Promise.resolve());
const defaultAddPRReviewersMock = jest.fn(() => Promise.resolve());
const defaultRemovePRReviewersMock = jest.fn(() => Promise.resolve());
const defaultListTeamMembersMock = jest.fn(() => Promise.resolve([]));
const defaultRequestMock = jest.fn(() => Promise.resolve({ status: 204 }));

const getOctokitMock = (mockOverrides) => ({
    rest: {
        teams: {
            listMembersInOrg:
                mockOverrides?.listTeamMembersMock ?? defaultListTeamMembersMock
        },
        issues: {
            get: defaultGetIssueMock,
            addAssignees: defaultAddIssueAssigneesMock,
            removeAssignees: defaultRemoveIssueAssigneesMock
        },
        pulls: {
            get: defaultGetPRMock,
            requestReviewers: defaultAddPRReviewersMock,
            removeRequestedReviewers: defaultRemovePRReviewersMock
        }
    },
    request: mockOverrides?.requestMock ?? defaultRequestMock
});

export {
    getOctokitMock,
    defaultGetIssueMock,
    defaultGetPRMock,
    defaultAddIssueAssigneesMock,
    defaultRemoveIssueAssigneesMock,
    defaultAddPRReviewersMock,
    defaultRemovePRReviewersMock,
    defaultListTeamMembersMock,
    defaultRequestMock
};
