/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import dataUtils from './modules/main/utils/data/dataUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';

const parseIssues = async () => {
  // const issuesArr = await jiraAPI.searchAll();
  // const issuesWithCommentsArr = [];
  // for (const issue of issuesArr) {
  //   const response = await jiraAPI.getIssueComments(issue.id);
  //   const parsedIssue = {
  //     key: issue.key,
  //     summary: issue.fields.summary,
  //     created: issue.fields.created,
  //     updated: issue.fields.updated,
  //     priority: issue.fields.priority.name,
  //     projectKey: issue.fields.project.key,
  //     projectName: issue.fields.project.name,
  //     devType: issue.fields.customfield_10085?.value,
  //     labels: issue.fields.labels,
  //     issuetype: issue.fields.issuetype.name,
  //     status: issue.fields.status.name,
  //     comments: response.data.comments,
  //     changelog: issue.changelog.histories,
  //   };

  //   issuesWithCommentsArr.push(parsedIssue);
  // }

  // dataUtils.saveToJSON({ issuesWithCommentsArr });

  const { issuesWithCommentsArr } = JSONLoader;

  let commentCreated;
  const filteredIssuesWithBugsArr = issuesWithCommentsArr.map((issueWithComments) => {
    const issueWithBugs = { ...issueWithComments };
    issueWithBugs.commentsWithBugs = issueWithComments.comments
      .flatMap((comment) => dataUtils.filterCommentsWithStatuses(comment, commentCreated));
    delete issueWithBugs.comments;
    issueWithBugs.linkedCommentsWithBugs = dataUtils.linkDevsWithBugs(issueWithBugs);
    delete issueWithBugs.commentsWithBugs;
    issueWithBugs.bugsCount = issueWithBugs.linkedCommentsWithBugs.length;
    return issueWithBugs;
  }).filter((issueWithComments) => issueWithComments.bugsCount > 0);

  dataUtils.saveToJSON({ filteredIssuesWithBugsArr });

  let overallBugsCount = 0;
  filteredIssuesWithBugsArr.forEach((issueWithBug) => {
    overallBugsCount += issueWithBug.bugsCount;
  });
  console.log(overallBugsCount)
};

parseIssues();
