const pickNRandomFromArray = (arr, n) => {
    if (arr.length === 0) {
        throw new Error('Can not pick random from empty list.');
    }
    const available = [...arr];
    const result = [];
    for (let i = 0; i < n && available.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * available.length);
        result.push(available.splice(randomIndex, 1)[0]);
    }
    return result;
};

const getTeamMembers = async (octokit, org, teamNames) => {
    const teamMemberRequests = await Promise.all(
        teamNames.map((teamName) =>
            octokit.rest.teams.listMembersInOrg({
                org,
                team_slug: teamName
            })
        )
    ).catch((err) => {
        const newErr = new Error('Failed to retrieve team members');
        newErr.stack += `\nCaused by: ${err.stack}`;
        throw newErr;
    });
    return teamMemberRequests
        .map((response) => response.data)
        .reduce((all, cur) => all.concat(cur), [])
        .map((user) => user.login);
};

/**
 * Runs the auto-assign issue action
 * @param {any} octokit
 * @param {Object} context
 * @param {string} assigneesString
 * @param {string} teamsString
 * @param {string} numOfAssigneeString
 */
const runAction = async (
    octokit,
    context,
    assigneesString,
    teamsString,
    numOfAssigneeString
) => {
    // Get repo and issue info from context
    const { repository } = context;

    const issue = context.issue || context.pull_request;

    if (!issue) {
        throw new Error(`Couldn't find issue info in current context`);
    }
    const [owner, repo] = repository.full_name.split('/');
    // Check params
    if (
        (!assigneesString || !assigneesString.trim()) &&
        (!teamsString || !teamsString.trim())
    ) {
        throw new Error(
            'Missing required paramters: you must provide assignees or teams'
        );
    }
    let numOfAssignee = 0;
    if (numOfAssigneeString) {
        numOfAssignee = parseInt(numOfAssigneeString, 10);
        if (isNaN(numOfAssignee)) {
            throw new Error(`Invalid numOfAssignee`);
        }
    }

    // Get issue assignees
    let assignees = [];

    // Get users
    if (assigneesString) {
        assignees = assigneesString
            .split(',')
            .map((assigneeName) => assigneeName.trim());
    }
    // Get team members
    if (teamsString) {
        const teamNames = teamsString
            .split(',')
            .map((teamName) => teamName.trim());
        if (teamNames) {
            const teamMembers = await getTeamMembers(octokit, owner, teamNames);
            assignees = assignees.concat(teamMembers);
        }
    }

    // Remove duplicates from assignees
    assignees = [...new Set(assignees)];

    // Select random assignees
    if (numOfAssignee) {
        assignees = pickNRandomFromArray(assignees, numOfAssignee);
    }

    // Assign issue
    console.log(
        `Assigning issue ${issue.number} to users ${JSON.stringify(assignees)}`
    );
    await octokit.rest.issues.addAssignees({
        owner,
        repo,
        issue_number: issue.number,
        assignees
    });
};

module.exports = {
    getTeamMembers,
    pickNRandomFromArray,
    runAction
};
