const core = require('@actions/core');
const github = require('@actions/github');
const { runAction } = require('./action');
const { parseIntInput, parseAssignments } = require('./utils');

try {
    // Get params
    const gitHubToken = core.getInput('repo-token', { required: true });
    const assignees = parseAssignments(
        core.getInput('assignees', { required: false })
    );
    const teams = parseAssignments(core.getInput('teams', { required: false }));
    let numOfAssignee;
    try {
        numOfAssignee = parseIntInput(
            core.getInput('numOfAssignee', {
                require: false
            }),
            0
        );
    } catch (error) {
        throw new Error(
            `Failed to parse value for numOfAssignee: ${error.message}`
        );
    }

    const abortIfPreviousAssignees = core.getBooleanInput(
        'abortIfPreviousAssignees',
        { required: false }
    );
    const removePreviousAssignees = core.getBooleanInput(
        'removePreviousAssignees',
        { required: false }
    );
    const allowNoAssignees = core.getBooleanInput('allowNoAssignees', {
        required: false
    });
    const allowSelfAssign = core.getBooleanInput('allowSelfAssign', {
        required: false
    });

    let manualIssueNumber;
    try {
        manualIssueNumber = parseIntInput(
            core.getInput('issueNumber', {
                require: false
            }),
            0
        );
    } catch (error) {
        throw new Error(
            `Failed to parse value for issueNumber: ${error.message}`
        );
    }

    const teamIsPullRequestReviewer = core.getBooleanInput(
        'teamIsPullRequestReviewer',
        {
            required: false
        }
    );

    // Get octokit
    const octokit = github.getOctokit(gitHubToken);

    // Get context
    const contextPayload = github.context.payload;

    // Run action
    runAction(octokit, contextPayload, {
        assignees,
        teams,
        numOfAssignee,
        abortIfPreviousAssignees,
        removePreviousAssignees,
        allowNoAssignees,
        allowSelfAssign,
        manualIssueNumber,
        teamIsPullRequestReviewer
    });
} catch (error) {
    core.setFailed(error.message);
}
