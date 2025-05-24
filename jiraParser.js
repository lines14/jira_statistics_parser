/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import dataUtils from './modules/main/utils/data/dataUtils.js';
import timeUtils from './modules/main/utils/time/timeUtils.js';
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

  let bugs = 0;
  filteredIssuesWithBugsArr.forEach((issueWithBugs) => {
    bugs += issueWithBugs.bugsCount;
  });

  const trimmedIssuesWithBugsArr = filteredIssuesWithBugsArr.map((filteredIssueWithBugs) => ({ 
    priority: filteredIssueWithBugs.priority, 
    projectName: filteredIssueWithBugs.projectName, 
    devType: filteredIssueWithBugs.devType, 
    issuetype: filteredIssueWithBugs.issuetype, 
    bugsCount: filteredIssueWithBugs.bugsCount, 
    linkedCommentsWithBugs: filteredIssueWithBugs.linkedCommentsWithBugs
    .map((linkedCommentWithBugs) => ({ 
      commentAuthor: linkedCommentWithBugs.commentAuthor, 
      lastPreviousDevAssignee: linkedCommentWithBugs.lastPreviousDevAssignee 
    })) 
  }));

  dataUtils.saveToJSON({ trimmedIssuesWithBugsArr });

  const projectNames = [...new Set(trimmedIssuesWithBugsArr
    .map((trimmedIssueWithBugs) => trimmedIssueWithBugs.projectName))];
  
  const bugsInProjects = {};
  projectNames.forEach((projectName) => {
      let bugsCount = 0;
      trimmedIssuesWithBugsArr.forEach((trimmedIssueWithBugs) => {
        if (trimmedIssueWithBugs.projectName === projectName) {
          bugsCount += trimmedIssueWithBugs.bugsCount;
        }
      });

      bugsInProjects[projectName] = bugsCount;
  });

  const priorities = [...new Set(trimmedIssuesWithBugsArr
    .map((trimmedIssueWithBugs) => trimmedIssueWithBugs.priority))];

  const bugsPerPriorities = {};
  priorities.forEach((priority) => {
      let bugsCount = 0;
      trimmedIssuesWithBugsArr.forEach((trimmedIssueWithBugs) => {
        if (trimmedIssueWithBugs.priority === priority) {
          bugsCount += trimmedIssueWithBugs.bugsCount;
        }
      });

      bugsPerPriorities[priority] = bugsCount;
  });

  const devTypes = [...new Set(trimmedIssuesWithBugsArr
    .map((trimmedIssueWithBugs) => trimmedIssueWithBugs.devType))];

  const bugsPerDevTypes = {};
  devTypes.forEach((devType) => {
      let bugsCount = 0;
      trimmedIssuesWithBugsArr.forEach((trimmedIssueWithBugs) => {
        if (trimmedIssueWithBugs.devType === devType) {
          bugsCount += trimmedIssueWithBugs.bugsCount;
        }
      });

      bugsPerDevTypes[devType] = bugsCount;
  });

  const issueTypes = [...new Set(trimmedIssuesWithBugsArr
    .map((trimmedIssueWithBugs) => trimmedIssueWithBugs.issuetype))];

  const bugsPerIssueTypes = {};
  issueTypes.forEach((issueType) => {
      let bugsCount = 0;
      trimmedIssuesWithBugsArr.forEach((trimmedIssueWithBugs) => {
        if (trimmedIssueWithBugs.issuetype === issueType) {
          bugsCount += trimmedIssueWithBugs.bugsCount;
        }
      });

      bugsPerIssueTypes[issueType] = bugsCount;
  });

  const reporters = [...new Set(trimmedIssuesWithBugsArr
    .flatMap((trimmedIssueWithBugs) => trimmedIssueWithBugs.linkedCommentsWithBugs
    .map((linkedCommentWithBugs) => linkedCommentWithBugs.commentAuthor)))];

  const bugsPerReporter = {};
  reporters.forEach((reporter) => {
      let bugsCount = 0;
      trimmedIssuesWithBugsArr.forEach((trimmedIssueWithBugs) => {
        trimmedIssueWithBugs.linkedCommentsWithBugs.forEach((linkedCommentWithBugs) => {
          if (linkedCommentWithBugs.commentAuthor === reporter) {
            bugsCount += 1;
          }
      })});

      bugsPerReporter[reporter] = bugsCount;
  });

  const summary = {
    issuesCreatedFrom: timeUtils.reformatDateFromYMDToDMY(JSONLoader.config.commentsWithBugsCreatedFromDateYMD),
    issuesCreatedTo: timeUtils.reformatDateFromISOToDMY(timeUtils.today()),
    issues: issuesWithCommentsArr.length,
    testedIssues: testedIssuesWithCommentsArr.length,
    testedIssuesWithBugs: filteredIssuesWithBugsArr.length,
    bugs,
    bugsPerTestedIssue: Number((bugs / testedIssuesWithCommentsArr.length).toFixed(2)),
    bugsPerTestedIssueWithBugs: Number((bugs / filteredIssuesWithBugsArr.length).toFixed(2)),
    bugsInProjects,
    bugsPerPriorities,
    bugsPerDevTypes,
    bugsPerIssueTypes,
    bugsPerReporter
  };

  dataUtils.saveToJSON({ summary });
};

parseIssues();
