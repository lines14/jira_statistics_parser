/* eslint-disable no-await-in-loop */
/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import ChangelogDTO from './modules/main/DTO/changelogDTO.js';
import DataUtils from './modules/main/utils/data/dataUtils.js';
import TimeUtils from './modules/main/utils/time/timeUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';
import DataFiller from './modules/main/utils/data/dataFiller.js';
import StatisticsUtils from './modules/main/utils/data/statisticsUtils.js';
import IssueWithCommentsDTO from './modules/main/DTO/issueWithCommentsDTO.js';
import PaginationAggregator from './modules/main/utils/data/paginationAggregator.js';

const parseIssues = async () => {
  const { dateBegin, dateEnd } = TimeUtils.getDates(...JSONLoader.config.timeDecrement);

  // get actual user names by atlassian account IDs from .env
  const users = (await jiraAPI.usersSearch()).data;
  const groups = await PaginationAggregator.getAllGroups();
  for (const group of groups) {
    const members = await PaginationAggregator.getAllGroupMembers(group.groupId);
    users.push(...members);
  }

  const developerNamesByAccountIDs = DataUtils.getDeveloperNamesByAccountIDs(users);
  const reporterNamesByAccountIDs = DataUtils.getReporterNamesByAccountIDs(users);

  // save developers and reporters to get ability to mock API requests during parser debug
  DataUtils.saveToJSON({ developerNamesByAccountIDs }, { folder: 'resources' });
  DataUtils.saveToJSON({ reporterNamesByAccountIDs }, { folder: 'resources' });

  // get all org issues with full changelog
  const issuesArr = await PaginationAggregator.getAllIssues(dateBegin, dateEnd);
  for (const issue of issuesArr) {
    if (issue.changelog.total > issue.changelog.maxResults) {
      const histories = (await PaginationAggregator.getAllChangelogItems(issue.id))
        .map((history) => new ChangelogDTO(history));
      issue.changelog.histories = histories;
    }
  }

  // filter all org issues with full changelog by last transition from backlog status
  const filteredIssuesArr = StatisticsUtils
    .filterLastTransitionDateFromBacklogIncluded(dateBegin, issuesArr);

  // get Jira issues with comments
  const issuesWithCommentsArr = [];
  for (const issue of filteredIssuesArr) {
    let response;
    do { // eslint-disable-next-line no-await-in-loop
      response = await jiraAPI.getIssueComments(issue.id);
    } while (response.status !== 200);

    issuesWithCommentsArr.push(new IssueWithCommentsDTO(issue, response.data.comments));
  }

  // save issues to get ability to mock API requests during parser debug
  DataUtils.saveToJSON({ issuesWithCommentsArr }, { folder: 'resources' });

  // uncomment this block to mock API requests during parser debug
  // const {
  //   issuesWithCommentsArr,
  //   developerNamesByAccountIDs,
  //   reporterNamesByAccountIDs,
  // } = JSONLoader;

  // filter ignored projects issues
  const filteredIssuesWithCommentsArr = issuesWithCommentsArr
    .filter((issueWithComment) => !JSONLoader.config.ignoredProjects
      .includes(issueWithComment.projectName));

  // get developers and reporters assigned issues
  const issuesWithDevelopersArr = StatisticsUtils
    .getDevelopersWorkload(filteredIssuesWithCommentsArr, developerNamesByAccountIDs);

  const issuesWithReportersArr = StatisticsUtils
    .getReportersWorkload(filteredIssuesWithCommentsArr, reporterNamesByAccountIDs);

  // get deployed or done Jira issues with developers without in progress status in history
  const deployedOrDoneWithoutInProgressIssuesWithCommentsArr = StatisticsUtils
    .getDeployedOrDoneIssuesWithDevelopersAndWithoutInProgressStatus(issuesWithDevelopersArr);

  // get Jira issues with reopen statuses in history
  const reopenedIssuesWithCommentsArr = StatisticsUtils
    .getReopenedIssuesWithReopensCount(filteredIssuesWithCommentsArr);

  // count overall reopens
  const overallReopensCount = StatisticsUtils.getOverallReopensCount(reopenedIssuesWithCommentsArr);

  // get Jira issues with testing statuses in history
  const testedIssuesWithCommentsArr = StatisticsUtils
    .getTestedIssues(filteredIssuesWithCommentsArr);

  // get developers and reporters tested issues
  const testedIssuesWithDevelopersArr = StatisticsUtils
    .getDevelopersWorkload(testedIssuesWithCommentsArr, developerNamesByAccountIDs);

  const testedIssuesWithReportersArr = StatisticsUtils
    .getReportersWorkload(testedIssuesWithCommentsArr, reporterNamesByAccountIDs);

  // filter Jira issues with bugs and fill them with their authors
  const testedIssuesWithBugsArr = StatisticsUtils
    .getTestesIssuesWithBugsAndAuthors(testedIssuesWithCommentsArr, developerNamesByAccountIDs);

  // get developers and reporters tested issues with bugs
  const testedIssuesWithBugsAndDevelopersArr = StatisticsUtils
    .getDevelopersWorkload(testedIssuesWithBugsArr, developerNamesByAccountIDs);

  const testedIssuesWithBugsAndReportersArr = StatisticsUtils
    .getReportersWorkload(testedIssuesWithBugsArr, reporterNamesByAccountIDs);

  // count overall bugs
  const overallBugsCount = StatisticsUtils.getOverallBugsCount(testedIssuesWithBugsArr);

  // search unique entities in issues
  const {
    projectNames,
    priorityNames,
    devTypeNames,
    issueTypeNames,
  } = StatisticsUtils.searchUniqueEntities(filteredIssuesWithCommentsArr);

  // set statistics for all entities
  const priorities = {};
  DataFiller.fillBugsAndIssuesPerEntities(
    priorities,
    filteredIssuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    reopenedIssuesWithCommentsArr,
    'priority',
    priorityNames,
    overallBugsCount,
    overallReopensCount,
  );

  const devTypes = {};
  DataFiller.fillBugsAndIssuesPerEntities(
    devTypes,
    filteredIssuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    reopenedIssuesWithCommentsArr,
    'devType',
    devTypeNames,
    overallBugsCount,
    overallReopensCount,
  );

  const issueTypes = {};
  DataFiller.fillBugsAndIssuesPerEntities(
    issueTypes,
    filteredIssuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    reopenedIssuesWithCommentsArr,
    'issuetype',
    issueTypeNames,
    overallBugsCount,
    overallReopensCount,
  );

  const projects = {};
  DataFiller.fillBugsAndIssuesPerEntities(
    projects,
    filteredIssuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    reopenedIssuesWithCommentsArr,
    'projectName',
    projectNames,
    overallBugsCount,
    overallReopensCount,
  );

  // set nested in projects statistics for some entities
  DataFiller.fillEntitiesPerProjects(
    projects,
    filteredIssuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    reopenedIssuesWithCommentsArr,
    'issuetype',
    issueTypeNames,
    overallBugsCount,
    overallReopensCount,
  );

  // set unassigned placeholder for issues without assignees
  developerNamesByAccountIDs.push(JSONLoader.config.issueWithoutAssignee);
  reporterNamesByAccountIDs.push(JSONLoader.config.issueWithoutAssignee);

  // get statistics for developers and reporters in assignees scope
  const developers = {};
  DataFiller.fillBugsAndIssuesPerAssignees(
    developers,
    issuesWithDevelopersArr,
    testedIssuesWithBugsArr,
    testedIssuesWithDevelopersArr,
    testedIssuesWithBugsAndDevelopersArr,
    projectNames,
    developerNamesByAccountIDs,
    overallBugsCount,
  );

  const reporters = {};
  DataFiller.fillBugsAndIssuesPerAssignees(
    reporters,
    issuesWithReportersArr,
    testedIssuesWithBugsArr,
    testedIssuesWithReportersArr,
    testedIssuesWithBugsAndReportersArr,
    projectNames,
    reporterNamesByAccountIDs,
    overallBugsCount,
    { withDevAssignees: false },
  );

  // get statistics for developers and reporters in projects scope
  const projectReporters = StatisticsUtils
    .convertAssigneesToProjectsStructure(reporters);

  const projectDevelopers = StatisticsUtils
    .convertAssigneesToProjectsStructure(developers);

  // get unassigned issues count from developers and reporters in projects scope
  const projectUnassignedReporterIssuesCount = StatisticsUtils
    .getProjectsUnassignedIssuesCount(projectReporters);

  const projectUnassignedDeveloperIssuesCount = StatisticsUtils
    .getProjectsUnassignedIssuesCount(projectDevelopers);

  // set unassigned issues count and ratio to projects
  StatisticsUtils.setUnassignedIssuesCountToProjects(
    projects,
    projectUnassignedReporterIssuesCount,
  );

  StatisticsUtils.setUnassignedIssuesCountToProjects(
    projects,
    projectUnassignedDeveloperIssuesCount,
    { developer: true },
  );

  const reportersUnassignedAllIssuesCount = StatisticsUtils
    .getAllUnassignedIssuesCount(reporters);
  const developersUnassignedAllIssuesCount = StatisticsUtils
    .getAllUnassignedIssuesCount(developers);

  const summary = { // generate statistics summary
    issuesCreatedFrom: TimeUtils
      .reformatDateFromYMDToDMY(dateBegin),
    issuesCreatedTo: TimeUtils.reformatDateFromYMDToDMY(dateEnd),
    overall: {
      issuesCount: filteredIssuesWithCommentsArr.length,
      testedIssuesCount: testedIssuesWithCommentsArr.length,
      testedIssuesWithBugsCount: testedIssuesWithBugsArr.length,
      reopenedIssuesCount: reopenedIssuesWithCommentsArr.length,
      deployedOrDoneWithoutInProgressIssuesCnt: deployedOrDoneWithoutInProgressIssuesWithCommentsArr
        .length,
      overallBugsCount,
      overallReopensCount,
      reportersUnassignedAllIssuesCount,
      developersUnassignedAllIssuesCount,
      bugsCountPerTestedIssueCountRatio: Number((overallBugsCount
        / testedIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      bugsCountPerTestedIssueWithBugsCountRatio: Number((overallBugsCount
        / testedIssuesWithBugsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      testedIssuesCountPerIssueCountRatio: Number((testedIssuesWithCommentsArr.length
        / filteredIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      testedIssuesWithBugsCountPerTestedIssueCountRatio: Number((testedIssuesWithBugsArr.length
        / testedIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      reopensCountPerReopenedIssueCountRatio: Number((overallReopensCount
        / reopenedIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      reopenedIssueCountPerIssueCountRatio: Number((reopenedIssuesWithCommentsArr.length
        / filteredIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      reopenedIssueCountPerTestedIssueCountRatio: Number((reopenedIssuesWithCommentsArr.length
          / testedIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      reopenedIssueCountPerTestedIssueWithBugsCountRatio: Number((reopenedIssuesWithCommentsArr
        .length / testedIssuesWithBugsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      reportersUnassignedAllIssuesCountPerIssuesCount: Number((reportersUnassignedAllIssuesCount
        / filteredIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
      developersUnassignedAllIssuesCountPerIssuesCount: Number((developersUnassignedAllIssuesCount
        / filteredIssuesWithCommentsArr.length).toFixed(JSONLoader.config.decimalPlaces)),
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

  DataUtils.saveToJSON({ summary }, { folder: 'resources' });
};

parseIssues();
