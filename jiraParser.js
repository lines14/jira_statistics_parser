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

  let issuesWithCommentsArr = [];
  const issuesArr = await jiraAPI.searchAll(
    JSONLoader.config.commentsWithBugsCreatedFromDateYMD,
    toDate,
  );

  for (const issue of issuesArr) {
    const response = await jiraAPI.getIssueComments(issue.id);
    const parsedIssue = {
      key: issue.key,
      summary: issue.fields.summary,
      created: issue.fields.created,
      updated: issue.fields.updated,
      priority: issue.fields.priority.name,
      projectKey: issue.fields.project.key,
      projectName: issue.fields.project.name,
      devType: issue.fields.customfield_10085?.value,
      labels: issue.fields.labels,
      issuetype: issue.fields.issuetype.name,
      status: issue.fields.status.name,
      comments: response.data.comments,
      changelog: issue.changelog.histories,
    };

    issuesWithCommentsArr.push(parsedIssue);
  }

  DataUtils.saveToJSON({ issuesWithCommentsArr }, { folder: 'resources' });

  // let { issuesWithCommentsArr } = JSONLoader;

  // filter data analytics issues
  issuesWithCommentsArr = issuesWithCommentsArr
    .filter((issueWithComment) => !JSONLoader.config.dataAnalyticsProjects
      .includes(issueWithComment.projectName));

  // get developers and reporters assigned issues
  const issuesWithDevelopersArr = DataUtils
    .getDevelopersWorkload(issuesWithCommentsArr);

  const issuesWithReportersArr = DataUtils
    .getReportersWorkload(issuesWithCommentsArr);

  // get Jira issues with testing statuses in history
  let testedIssuesWithCommentsArr = issuesWithCommentsArr
    .map((issueWithComments) => structuredClone(issueWithComments))
    .filter((issueWithComments) => issueWithComments.changelog
      .some((changelogItem) => changelogItem.items
        .some((item) => JSONLoader.config.testIssueStatuses.includes(item.fromString?.toUpperCase())
        || JSONLoader.config.testIssueStatuses.includes(item.toString?.toUpperCase()))));

  // filter data analytics issues
  testedIssuesWithCommentsArr = testedIssuesWithCommentsArr
    .filter((testedIssueWithComment) => !JSONLoader.config.dataAnalyticsProjects
      .includes(testedIssueWithComment.projectName));

  // get developers and reporters tested issues
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

  let testedIssuesWithBugsArr = testedIssuesWithCommentsArr
    .map((issueWithComments) => structuredClone(issueWithComments))
    .filter((testedIssueWithComments) => testedIssueWithComments.bugsCount > 0);

  // filter data analytics issues
  testedIssuesWithBugsArr = testedIssuesWithBugsArr
    .filter((testedIssueWithBugs) => !JSONLoader.config.dataAnalyticsProjects
      .includes(testedIssueWithBugs.projectName));

  // get developers and reporters tested issues with bugs
  const testedIssuesWithBugsAndDevelopersArr = DataUtils
    .getDevelopersWorkload(testedIssuesWithBugsArr);

  const testedIssuesWithBugsAndReportersArr = DataUtils
    .getReportersWorkload(testedIssuesWithBugsArr);

  let overallBugsCount = 0; // count overall bugs
  testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
    overallBugsCount += testedIssueWithBugs.bugsCount;
  });

  // search unique entities in issues
  const projectNames = [...new Set(issuesWithCommentsArr
    .map((issueWithComments) => issueWithComments.projectName))];

  const priorityNames = [...new Set(issuesWithCommentsArr
    .map((issueWithComments) => issueWithComments.priority))];

  const devTypeNames = [...new Set(issuesWithCommentsArr
    .map((issueWithComments) => issueWithComments.devType
    ?? JSONLoader.config.issueWithoutAssignee))];

  const issueTypeNames = [...new Set(issuesWithCommentsArr
    .map((issueWithComments) => issueWithComments.issuetype))];

  const developerNames = JSONLoader.config.developers;
  developerNames.push(JSONLoader.config.issueWithoutAssignee);

  const reporterNames = JSONLoader.config.reporters;
  reporterNames.push(JSONLoader.config.issueWithoutAssignee);

  // get statistics for all entities
  const priorities = {};
  DataUtils.fillBugsAndIssuesPerEntities(
    priorities,
    issuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    'priority',
    priorityNames,
    overallBugsCount,
  );

  const devTypes = {};
  DataUtils.fillBugsAndIssuesPerEntities(
    devTypes,
    issuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    'devType',
    devTypeNames,
    overallBugsCount,
  );

  const issueTypes = {};
  DataUtils.fillBugsAndIssuesPerEntities(
    issueTypes,
    issuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    'issuetype',
    issueTypeNames,
    overallBugsCount,
  );

  const projects = {};
  DataUtils.fillBugsAndIssuesPerEntities(
    projects,
    issuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    'projectName',
    projectNames,
    overallBugsCount,
  );

  // get statistics for developers and reporters in assignees scope
  const developers = {};
  DataUtils.fillBugsAndIssuesPerAssignees(
    developers,
    issuesWithDevelopersArr,
    testedIssuesWithBugsArr,
    testedIssuesWithDevelopersArr,
    testedIssuesWithBugsAndDevelopersArr,
    projectNames,
    developerNames,
    overallBugsCount,
  );

  const reporters = {};
  DataUtils.fillBugsAndIssuesPerAssignees(
    reporters,
    issuesWithReportersArr,
    testedIssuesWithBugsArr,
    testedIssuesWithReportersArr,
    testedIssuesWithBugsAndReportersArr,
    projectNames,
    reporterNames,
    overallBugsCount,
    { lastPreviousDevAssignee: false },
  );

  // get statistics for developers and reporters in projects scope
  const projectReporters = DataUtils
    .convertAssigneesToProjectsStructure(reporters);

  const projectDevelopers = DataUtils
    .convertAssigneesToProjectsStructure(developers);

  // get unassigned issues count from developers and reporters in projects scope
  const projectUnassignedReporterIssuesCount = DataUtils
    .getProjectsUnassignedIssuesCount(projectReporters);

  const projectUnassignedDeveloperIssuesCount = DataUtils
    .getProjectsUnassignedIssuesCount(projectDevelopers);

  // set unassigned issues count and ratio to projects
  DataUtils.setUnassignedIssuesCountToProjects(
    projects,
    projectUnassignedReporterIssuesCount,
  );

  DataUtils.setUnassignedIssuesCountToProjects(
    projects,
    projectUnassignedDeveloperIssuesCount,
    { developer: true },
  );

  const summary = { // generate statistics summary
    issuesCreatedFrom: TimeUtils
      .reformatDateFromYMDToDMY(JSONLoader.config.commentsWithBugsCreatedFromDateYMD),
    issuesCreatedTo: TimeUtils.reformatDateFromYMDToDMY(toDate),
    overall: {
      issuesCount: issuesWithCommentsArr.length,
      testedIssuesCount: testedIssuesWithCommentsArr.length,
      testedIssuesWithBugsCount: testedIssuesWithBugsArr.length,
      overallBugsCount,
      reportersUnassignedAllIssuesCount: reporters.unassigned.allIssuesCount,
      developersUnassignedAllIssuesCount: developers.unassigned.allIssuesCount,
      bugsCountPerTestedIssueCountRatio: Number((overallBugsCount
        / testedIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      bugsCountPerTestedIssueWithBugsCountRatio: Number((overallBugsCount
        / testedIssuesWithBugsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      reportersUnassignedAllIssuesCountPerIssuesCount: Number((reporters.unassigned.allIssuesCount
        / issuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      developersUnassignedAllIssuesCountPerIssuesCount: Number((developers.unassigned.allIssuesCount
        / issuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
    },
    priorities,
    devTypes,
    issueTypes,
    projects,
    projectReporters,
    projectDevelopers,
    reporters,
    developers,
  };

  delete summary.reporters.unassigned;
  delete summary.developers.unassigned;

  DataUtils.saveToJSON({ summary }, { folder: 'resources' });
};

parseIssues();
