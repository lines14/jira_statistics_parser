/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import dataUtils from './modules/main/utils/data/dataUtils.js';

const parseIssues = async () => {
  let response = await jiraAPI.search();
  const issues = [];
  for (const issue of response.data.issues) {
    response = await jiraAPI.getIssueComments(issue.id);
    const parsedIssue = {
      key: issue.key,
      comments: response.data.comments,
    };

    issues.push(parsedIssue);
  }

  dataUtils.saveToJSON({ issues });
};

parseIssues();
