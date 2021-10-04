const core = require('@actions/core');
const github = require('@actions/github');

const pickRandomFromArray = (arr) => {
    if (arr.length === 0) {
        throw new Error('Can not pick random from empty list.');
    }

    return arr[Math.floor(Math.random() * arr.length)];
};

const pickNRandomFromArray = (arr, n) => {
    const result = [];
    for (let i = 0; i < n; i++) {
        const arrayWithoutPickedOnes = arr.filter((a) => !result.includes(a));
        const newRandom = pickRandomFromArray(arrayWithoutPickedOnes);
        result.push(newRandom);
    }
    return result;
};

const run = async () => {
    // Get octokit
    const gitHubToken = core.getInput('repo-token', { required: true });
    const octokit = github.getOctokit(gitHubToken);

    // Get repo and issue info
    const { repository, issue } = github.context.payload;
    if (!issue) {
        throw new Error(`Couldn't find issue info in current context`);
    }
    const [owner, repo] = repository.full_name.split('/');

    // Get issue assignees
    const assigneesString = core.getInput('assignees', { required: true });
    let assignees = assigneesString
        .split(',')
        .map((assigneeName) => assigneeName.trim());

    const numOfAssigneeString = core.getInput('numOfAssignee', {
        require: false
    });
    if (numOfAssigneeString) {
        const numOfAssignee = parseInt(numOfAssigneeString, 10);
        if (isNaN(numOfAssignee)) {
            throw new Error(`Invalid numOfAssignee`);
        }
        assignees = pickNRandomFromArray(assignees, numOfAssignee);
    }

    // Assign issue
    console.log(
        `Assigning issue ${issue.number} to users ${JSON.stringify(assignees)}`
    );
    try {
        await octokit.rest.issues.addAssignees({
            owner,
            repo,
            issue_number: issue.number,
            assignees
        });
    } catch (error) {
        core.setFailed(error.message);
    }
};

try {
    run();
} catch (error) {
    core.setFailed(error.message);
}
