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

  let commentCreatedAt;
  const filteredIssuesWithBugsArr = issuesWithCommentsArr.map((issueWithComments) => {
    const issueWithBugs = {
      ...issueWithComments,
      commentsWithBugs: issueWithComments.comments
        .flatMap((comment) => dataUtils.filterCommentsWithStatuses(comment, commentCreatedAt)),
    };

    issueWithBugs.bugsCount = issueWithBugs.commentsWithBugs.length;
    delete issueWithBugs.comments;
    return issueWithBugs;
  }).filter((issueWithComments) => issueWithComments.bugsCount > 0);

  dataUtils.saveToJSON({ filteredIssuesWithBugsArr });

  let overallBugsCount = 0;
  filteredIssuesWithBugsArr.forEach((issueWithBug) => {
    overallBugsCount += issueWithBug.bugsCount;
  });
};

parseIssues();
