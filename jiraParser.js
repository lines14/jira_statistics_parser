/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import dataUtils from './modules/main/utils/data/dataUtils.js';

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
};

parseIssues();
