/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import dataUtils from './modules/main/utils/data/dataUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';

const parseIssues = async () => {
  // const issuesArr = await jiraAPI.searchAll(JSONLoader.config.commentsWithBugsCreatedFromDateYMD);
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

  const testedIssuesWithCommentsArr =  issuesWithCommentsArr
  .filter((issueWithComments) => issueWithComments.changelog
  .some((changelogItem) => changelogItem.items
  .some((item) => JSONLoader.config.testIssueStatuses.includes(item.fromString?.toUpperCase()))));
  
  dataUtils.saveToJSON({ testedIssuesWithCommentsArr });

  let commentAuthor;
  let commentCreated;
  const filteredIssuesWithBugsArr = testedIssuesWithCommentsArr.map((testedIssueWithComments) => {
    const issueWithBugs = { ...testedIssueWithComments };
    issueWithBugs.commentsWithBugs = testedIssueWithComments.comments
      .flatMap((comment) => dataUtils.filterCommentsWithStatuses(comment, commentCreated, commentAuthor));
    delete issueWithBugs.comments;
    issueWithBugs.linkedCommentsWithBugs = dataUtils.linkDevsWithBugs(issueWithBugs);
    delete issueWithBugs.commentsWithBugs;
    delete issueWithBugs.changelog;
    issueWithBugs.bugsCount = issueWithBugs.linkedCommentsWithBugs.length;

    return issueWithBugs;
  }).filter((testedIssueWithComments) => testedIssueWithComments.bugsCount > 0);

  dataUtils.saveToJSON({ filteredIssuesWithBugsArr });

  let overallBugsCount = 0;
  filteredIssuesWithBugsArr.forEach((issueWithBug) => {
    overallBugsCount += issueWithBug.bugsCount;
  });

  const summary = {
    overallIssuesCount: issuesWithCommentsArr.length,
    overallTestedIssuesCount: testedIssuesWithCommentsArr.length,
    overallTestedIssuesWithBugsCount: filteredIssuesWithBugsArr.length,
    overallBugsCount
  };

  dataUtils.saveToJSON({ summary });
};

parseIssues();
