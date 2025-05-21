/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import dataUtils from './modules/main/utils/data/dataUtils.js';
// import JSONLoader from './modules/main/utils/data/JSONLoader.js';

const parseIssues = async () => {
  const issuesArr = await jiraAPI.searchAll();
  const issuesWithCommentsArr = [];
  for (const issue of issuesArr) {
    const response = await jiraAPI.getIssueComments(issue.id);
    const parsedIssue = {
      key: issue.key,
      comments: response.data.comments,
    };

    issuesWithCommentsArr.push(parsedIssue);
  }

  dataUtils.saveToJSON({ issuesWithCommentsArr });

  // const issuesWithCommentsArr = JSONLoader.issuesWithCommentsArr;

  const filteredIssuesWithCommentsArr = issuesWithCommentsArr.map((issueWithComment) => ({
    key: issueWithComment.key,
    bugsCount: dataUtils.filterCommentsWithStatuses(issueWithComment.comments).length,
  })).filter((issueWithComment) => issueWithComment.bugsCount > 0);
};

parseIssues();
