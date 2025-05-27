/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import DataUtils from './modules/main/utils/data/dataUtils.js';
import TimeUtils from './modules/main/utils/time/timeUtils.js';
import ImageUtils from './modules/main/utils/image/imageUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';

const parseIssues = async () => { // get Jira issues with comments
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

  // DataUtils.saveToJSON({ issuesWithCommentsArr });

  const { issuesWithCommentsArr } = JSONLoader;

  // get Jira issues with testing statuses in history
  const testedIssuesWithCommentsArr = issuesWithCommentsArr
    .filter((issueWithComments) => issueWithComments.changelog
      .some((changelogItem) => changelogItem.items
        .some((item) => JSONLoader.config.testIssueStatuses.includes(item.fromString?.toUpperCase())
        || JSONLoader.config.testIssueStatuses.includes(item.toString?.toUpperCase()))));

  DataUtils.saveToJSON({ testedIssuesWithCommentsArr });

  let commentAuthor;
  let commentCreated; // fill and filter Jira issues with bugs and authors
  const testedIssuesWithBugsArr = testedIssuesWithCommentsArr.map((testedIssueWithComments) => {
    const testedIssueWithBugs = { ...testedIssueWithComments };
    testedIssueWithBugs.commentsWithBugs = testedIssueWithComments.comments
      .flatMap((comment) => DataUtils.filterCommentsWithBugs(
        comment,
        commentCreated,
        commentAuthor,
      ));
    delete testedIssueWithBugs.comments;
    testedIssueWithBugs.linkedCommentsWithBugs = DataUtils
      .linkDevelopersWithBugs(testedIssueWithBugs);
    delete testedIssueWithBugs.commentsWithBugs;
    delete testedIssueWithBugs.changelog;
    testedIssueWithBugs.bugsCount = testedIssueWithBugs.linkedCommentsWithBugs.length;

    return testedIssueWithBugs;
  }).filter((testedIssueWithComments) => testedIssueWithComments.bugsCount > 0);

  DataUtils.saveToJSON({ testedIssuesWithBugsArr });

  let bugs = 0; // count overall bugs
  testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
    bugs += testedIssueWithBugs.bugsCount;
  });

  // search unique entities in issues with bugs
  const projectNames = [...new Set(testedIssuesWithBugsArr
    .map((testedIssueWithBugsArr) => testedIssueWithBugsArr.projectName))];

  const priorities = [...new Set(testedIssuesWithBugsArr
    .map((testedIssueWithBugsArr) => testedIssueWithBugsArr.priority))];

  const devTypes = [...new Set(testedIssuesWithBugsArr
    .map((testedIssueWithBugsArr) => testedIssueWithBugsArr.devType))];

  const issueTypes = [...new Set(testedIssuesWithBugsArr
    .map((testedIssueWithBugsArr) => testedIssueWithBugsArr.issuetype))];

  const reporters = [...new Set(testedIssuesWithBugsArr
    .flatMap((testedIssueWithBugsArr) => testedIssueWithBugsArr.linkedCommentsWithBugs
      .map((linkedCommentWithBugs) => linkedCommentWithBugs.commentAuthor)))];

  const developers = [...new Set(testedIssuesWithBugsArr
    .flatMap((testedIssueWithBugsArr) => testedIssueWithBugsArr.linkedCommentsWithBugs
      .map((linkedCommentWithBugs) => linkedCommentWithBugs
        .lastPreviousDevAssignee?.transitionFromAssignee
      ?? JSONLoader.config.issueWithoutAssignee)))];

  const projects = {};
  projectNames.forEach((projectName) => {
    let bugsCount = 0;
    testedIssuesWithBugsArr.forEach((testedIssueWithBugsArr) => {
      if (testedIssueWithBugsArr.projectName === projectName) {
        bugsCount += testedIssueWithBugsArr.bugsCount;
      }
    });

    projects[projectName] = bugsCount;
  });

  const bugsPerPriorities = {};
  priorities.forEach((priority) => {
    let bugsCount = 0;
    testedIssuesWithBugsArr.forEach((testedIssueWithBugsArr) => {
      if (testedIssueWithBugsArr.priority === priority) {
        bugsCount += testedIssueWithBugsArr.bugsCount;
      }
    });

    const ratio = Number((bugsCount / bugs).toFixed(2));
    bugsPerPriorities[priority] = { bugsCount, ratio };
  });

  const bugsPerDevTypes = {};
  devTypes.forEach((devType) => {
    let bugsCount = 0;
    testedIssuesWithBugsArr.forEach((testedIssueWithBugsArr) => {
      if (testedIssueWithBugsArr.devType === devType) {
        bugsCount += testedIssueWithBugsArr.bugsCount;
      }
    });

    const ratio = Number((bugsCount / bugs).toFixed(2));
    bugsPerDevTypes[devType] = { bugsCount, ratio };
  });

  const bugsPerIssueTypes = {};
  issueTypes.forEach((issueType) => {
    let bugsCount = 0;
    testedIssuesWithBugsArr.forEach((testedIssueWithBugsArr) => {
      if (testedIssueWithBugsArr.issuetype === issueType) {
        bugsCount += testedIssueWithBugsArr.bugsCount;
      }
    });

    const ratio = Number((bugsCount / bugs).toFixed(2));
    bugsPerIssueTypes[issueType] = { bugsCount, ratio };
  });

  const bugsPerReporter = {};
  reporters.forEach((reporter) => {
    let overallCount = 0;
    const projectBugCounts = {};
    projectNames.forEach((projectName) => {
      let bugsCount = 0;
      testedIssuesWithBugsArr.forEach((testedIssueWithBugsArr) => {
        testedIssueWithBugsArr.linkedCommentsWithBugs.forEach((linkedCommentWithBugs) => {
          if (
            testedIssueWithBugsArr.projectName === projectName
            && linkedCommentWithBugs.commentAuthor === reporter
          ) {
            bugsCount += 1;
          }
        });
      });
      if (bugsCount > 0) {
        projectBugCounts[projectName] = bugsCount;
        overallCount += bugsCount;
      }
    });
    if (overallCount > 0) {
      bugsPerReporter[reporter] = {
        projects: projectBugCounts,
        overall: overallCount,
      };
    }
  });

  const bugsPerDeveloper = {};
  developers.forEach((developer) => {
    let overallCount = 0;
    const projectBugCounts = {};
    projectNames.forEach((projectName) => {
      let bugsCount = 0;
      testedIssuesWithBugsArr.forEach((testedIssueWithBugsArr) => {
        testedIssueWithBugsArr.linkedCommentsWithBugs.forEach((linkedCommentWithBugs) => {
          if (
            testedIssueWithBugsArr.projectName === projectName
            && (linkedCommentWithBugs.lastPreviousDevAssignee?.transitionFromAssignee
              ?? JSONLoader.config.issueWithoutAssignee) === developer
          ) {
            bugsCount += 1;
          }
        });
      });
      if (bugsCount > 0) {
        projectBugCounts[projectName] = bugsCount;
        overallCount += bugsCount;
      }
    });
    if (overallCount > 0) {
      bugsPerDeveloper[developer] = {
        projects: projectBugCounts,
        overall: overallCount,
      };
    }
  });

  const summary = { // generate statistics summary
    issuesCreatedFrom: TimeUtils
      .reformatDateFromYMDToDMY(JSONLoader.config.commentsWithBugsCreatedFromDateYMD),
    issuesCreatedTo: TimeUtils.reformatDateFromISOToDMY(TimeUtils.today()),
    issues: issuesWithCommentsArr.length,
    testedIssues: testedIssuesWithCommentsArr.length,
    testedIssuesWithBugs: testedIssuesWithBugsArr.length,
    bugs,
    bugsPerTestedIssueRatio: Number((bugs / testedIssuesWithCommentsArr.length).toFixed(2)),
    bugsPerTestedIssueWithBugsRatio: Number((bugs / testedIssuesWithBugsArr.length).toFixed(2)),
    bugsPerPriorities,
    bugsPerDevTypes,
    bugsPerIssueTypes,
    projects,
    bugsPerReporter,
    bugsPerDeveloper,
  };

  DataUtils.saveToJSON({ summary });
};

parseIssues();
