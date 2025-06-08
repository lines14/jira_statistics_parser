/* eslint-disable no-await-in-loop */
/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import DataUtils from './modules/main/utils/data/dataUtils.js';
import TimeUtils from './modules/main/utils/time/timeUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';

const parseIssues = async () => { // get Jira issues with comments
  const toDate = JSONLoader.config.commentsWithBugsCreatedToDateYMD
    ? JSONLoader.config.commentsWithBugsCreatedToDateYMD
    : TimeUtils
      .reformatDateFromDMYToYMD(TimeUtils.reformatDateFromISOToDMY(TimeUtils.today()));

  // const issuesWithCommentsArr = [];
  // const issuesArr = await jiraAPI.searchAll(
  //   JSONLoader.config.commentsWithBugsCreatedFromDateYMD,
  //   toDate,
  // );

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

  // DataUtils.saveToJSON({ issuesWithCommentsArr });

  const { issuesWithCommentsArr } = JSONLoader;

  // get Jira issues with testing statuses in history
  const testedIssuesWithCommentsArr = issuesWithCommentsArr
    .filter((issueWithComments) => issueWithComments.changelog
      .some((changelogItem) => changelogItem.items
        .some((item) => JSONLoader.config.testIssueStatuses.includes(item.fromString?.toUpperCase())
        || JSONLoader.config.testIssueStatuses.includes(item.toString?.toUpperCase()))));

  DataUtils.saveToJSON({ testedIssuesWithCommentsArr });

  const testedIssuesWithDevelopersArr = DataUtils
    .getDevelopersWorkload(testedIssuesWithCommentsArr);

  const testedIssuesWithReportersArr = DataUtils
    .getReportersWorkload(testedIssuesWithCommentsArr);

  let commentAuthor;
  let commentCreated; // fill and filter Jira issues with bugs and authors
  testedIssuesWithCommentsArr.forEach((testedIssueWithComments) => {
    testedIssueWithComments.commentsWithBugs = testedIssueWithComments.comments
      .flatMap((comment) => DataUtils.filterCommentsWithBugs(
        comment,
        commentCreated,
        commentAuthor,
      ));
    testedIssueWithComments.linkedCommentsWithBugs = DataUtils
      .linkDevelopersWithBugs(testedIssueWithComments);
    testedIssueWithComments.bugsCount = testedIssueWithComments.linkedCommentsWithBugs.length;
    delete testedIssueWithComments.commentsWithBugs;
    delete testedIssueWithComments.comments;
  });

  const testedIssuesWithBugsArr = testedIssuesWithCommentsArr
    .filter((testedIssueWithComments) => testedIssueWithComments.bugsCount > 0);

  DataUtils.saveToJSON({ testedIssuesWithBugsArr });

  const testedIssuesWithBugsAndDevelopersArr = DataUtils
    .getDevelopersWorkload(testedIssuesWithBugsArr);

  const testedIssuesWithBugsAndReportersArr = DataUtils
    .getReportersWorkload(testedIssuesWithBugsArr);

  let overallBugsCount = 0; // count overall bugs
  testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
    overallBugsCount += testedIssueWithBugs.bugsCount;
  });

  // search unique entities in issues with bugs
  const projectNames = [...new Set(testedIssuesWithCommentsArr
    .map((testedIssueWithComments) => testedIssueWithComments.projectName))];

  const priorityNames = [...new Set(testedIssuesWithCommentsArr
    .map((testedIssueWithComments) => testedIssueWithComments.priority))];

  const devTypeNames = [...new Set(testedIssuesWithCommentsArr
    .map((testedIssueWithComments) => testedIssueWithComments.devType
    ?? JSONLoader.config.issueWithoutAssignee))];

  const issueTypeNames = [...new Set(testedIssuesWithCommentsArr
    .map((testedIssueWithComments) => testedIssueWithComments.issuetype))];

  const reporterNames = [...new Set(testedIssuesWithCommentsArr
    .flatMap((testedIssueWithComments) => (testedIssueWithComments.linkedCommentsWithBugs?.length
      ? testedIssueWithComments.linkedCommentsWithBugs
        .map((linkedCommentWithBugs) => linkedCommentWithBugs.commentAuthor
    ?? JSONLoader.config.issueWithoutAssignee)
      : [JSONLoader.config.issueWithoutAssignee])))];

  const developerNames = [...new Set(testedIssuesWithCommentsArr
    .flatMap((testedIssueWithComments) => (testedIssueWithComments.linkedCommentsWithBugs?.length
      ? testedIssueWithComments.linkedCommentsWithBugs
        .map((linkedCommentWithBugs) => linkedCommentWithBugs
          .lastPreviousDevAssignee?.transitionFromAssignee
      ?? JSONLoader.config.issueWithoutAssignee)
      : [JSONLoader.config.issueWithoutAssignee])))];

  // get statistics
  const priorities = {};
  DataUtils.fillBugsPerEntities(
    priorities,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    'priority',
    priorityNames,
    overallBugsCount,
  );

  const devTypes = {};
  DataUtils.fillBugsPerEntities(
    devTypes,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    'devType',
    devTypeNames,
    overallBugsCount,
  );

  const issueTypes = {};
  DataUtils.fillBugsPerEntities(
    issueTypes,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    'issuetype',
    issueTypeNames,
    overallBugsCount,
  );

  const projects = {};
  DataUtils.fillBugsPerEntities(
    projects,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    'projectName',
    projectNames,
    overallBugsCount,
  );

  const developers = {};
  DataUtils.fillBugsPerAssignees(
    developers,
    testedIssuesWithBugsArr,
    testedIssuesWithDevelopersArr,
    testedIssuesWithBugsAndDevelopersArr,
    projectNames,
    developerNames,
    overallBugsCount,
  );

  const reporters = {};
  DataUtils.fillBugsPerAssignees(
    reporters,
    testedIssuesWithBugsArr,
    testedIssuesWithReportersArr,
    testedIssuesWithBugsAndReportersArr,
    projectNames,
    reporterNames,
    overallBugsCount,
    { lastPreviousDevAssignee: false },
  );

  const summary = { // generate statistics summary
    issuesCreatedFrom: TimeUtils
      .reformatDateFromYMDToDMY(JSONLoader.config.commentsWithBugsCreatedFromDateYMD),
    issuesCreatedTo: TimeUtils.reformatDateFromYMDToDMY(toDate),
    issuesCount: issuesWithCommentsArr.length,
    testedIssuesCount: testedIssuesWithCommentsArr.length,
    testedIssuesWithBugsCount: testedIssuesWithBugsArr.length,
    overallBugsCount,
    bugsCountPerTestedIssueCountRatio: Number((overallBugsCount
      / testedIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
    bugsCountPerTestedIssueWithBugsCountRatio: Number((overallBugsCount
      / testedIssuesWithBugsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
    priorities,
    devTypes,
    issueTypes,
    projects,
    reporters,
    developers,
  };

  DataUtils.saveToJSON({ summary });
};

parseIssues();