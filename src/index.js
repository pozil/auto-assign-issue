import * as core from '@actions/core';
import * as github from '@actions/github';
import { runAction } from './action.js';
import { parseIntInput, parseAssignments } from './utils.js';

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
            `Failed to parse value for numOfAssignee: ${error.message}`,
            { cause: error }
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
            `Failed to parse value for issueNumber: ${error.message}`,
            { cause: error }
        );
    }

    const teamIsPullRequestReviewer = core.getBooleanInput(
        'teamIsPullRequestReviewer',
        {
            required: false
        }
    );

    const failsIfUsersCannotBeAssigned = core.getBooleanInput(
        'failsIfUsersCannotBeAssigned',
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
        teamIsPullRequestReviewer,
        failsIfUsersCannotBeAssigned
    });
} catch (error) {
    core.setFailed(error.message);
}
