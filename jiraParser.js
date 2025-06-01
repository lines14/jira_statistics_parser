/* eslint-disable no-await-in-loop */
/* eslint no-param-reassign: ["off"] */
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

  const developersWorkload = testedIssuesWithCommentsArr
    .filter((testedIssueWithComments) => !JSONLoader.config.debugIssues.includes(testedIssueWithComments.key))
    .map((testedIssueWithComments) => ({
      [testedIssueWithComments.projectName]: [...new Set(DataUtils.getDevelopersWorkload(testedIssueWithComments)
        .flat()
        .map((developer) => developer.transitionFromAssignee))],
    }));

  // .map((testedIssueWithComments, index) => {
  //     if (testedIssueWithComments.key === 'MADP-384') {
  //       DataUtils.getDevelopersWorkload(testedIssueWithComments)
  //       throw new Error('kek')
  //     }
  //   });
  // .map((testedIssueWithComments) => DataUtils.getDevelopersWorkload(testedIssueWithComments))

  console.log(developersWorkload);

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
    delete testedIssueWithComments.changelog;
  });

  const testedIssuesWithBugsArr = testedIssuesWithCommentsArr
    .filter((testedIssueWithComments) => testedIssueWithComments.bugsCount > 0);

  DataUtils.saveToJSON({ testedIssuesWithBugsArr });

  let overallBugsCount = 0; // count overall bugs
  testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
    overallBugsCount += testedIssueWithBugs.bugsCount;
  });

  // search unique entities in issues with bugs
  const projectNames = [...new Set(testedIssuesWithBugsArr
    .map((testedIssueWithBugsArr) => testedIssueWithBugsArr.projectName))];

  const priorityNames = [...new Set(testedIssuesWithBugsArr
    .map((testedIssueWithBugsArr) => testedIssueWithBugsArr.priority))];

  const devTypeNames = [...new Set(testedIssuesWithBugsArr
    .map((testedIssueWithBugsArr) => testedIssueWithBugsArr.devType))];

  const issueTypeNames = [...new Set(testedIssuesWithBugsArr
    .map((testedIssueWithBugsArr) => testedIssueWithBugsArr.issuetype))];

  const reporterNames = [...new Set(testedIssuesWithBugsArr
    .flatMap((testedIssueWithBugsArr) => testedIssueWithBugsArr.linkedCommentsWithBugs
      .map((linkedCommentWithBugs) => linkedCommentWithBugs.commentAuthor)))];

  const developerNames = [...new Set(testedIssuesWithBugsArr
    .flatMap((testedIssueWithBugsArr) => testedIssueWithBugsArr.linkedCommentsWithBugs
      .map((linkedCommentWithBugs) => linkedCommentWithBugs
        .lastPreviousDevAssignee?.transitionFromAssignee
      ?? JSONLoader.config.issueWithoutAssignee)))];

  // get statistics
  const priorities = {};
  DataUtils.fillBugsPerEntities(priorities, testedIssuesWithBugsArr, 'priority', priorityNames, overallBugsCount);

  const devTypes = {};
  DataUtils.fillBugsPerEntities(devTypes, testedIssuesWithBugsArr, 'devType', devTypeNames, overallBugsCount);

  const issueTypes = {};
  DataUtils.fillBugsPerEntities(issueTypes, testedIssuesWithBugsArr, 'issuetype', issueTypeNames, overallBugsCount);

  const projects = {};
  projectNames.forEach((projectName) => {
    let bugsCount = 0;
    const testedIssuesCount = testedIssuesWithCommentsArr
      .filter((testedIssue) => testedIssue.projectName === projectName).length;
    const testedIssuesWithBugsCount = testedIssuesWithBugsArr
      .filter((testedIssueWithBugs) => testedIssueWithBugs.projectName === projectName).length;
    testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
      if (testedIssueWithBugs.projectName === projectName) {
        bugsCount += testedIssueWithBugs.bugsCount;
      }
    });

    const bugsCountPerTestedIssueCountRatio = Number((bugsCount
      / testedIssuesCount).toFixed(2));
    const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
      / testedIssuesWithBugsCount).toFixed(2));
    projects[projectName] = {
      testedIssuesCount,
      testedIssuesWithBugsCount,
      bugsCount,
      bugsCountPerTestedIssueCountRatio,
      bugsCountPerTestedIssueWithBugsCountRatio,
    };
  });

  const reporters = {};
  reporterNames.forEach((reporterName) => {
    let overAllBugsCount = 0;
    const projectBugCounts = {};
    projectNames.forEach((projectName) => {
      let bugsCount = 0;
      testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
        testedIssueWithBugs.linkedCommentsWithBugs.forEach((linkedCommentWithBugs) => {
          if (
            testedIssueWithBugs.projectName === projectName
            && linkedCommentWithBugs.commentAuthor === reporterName
          ) {
            bugsCount += 1;
          }
        });
      });
      if (bugsCount > 0) {
        projectBugCounts[projectName] = bugsCount;
        overAllBugsCount += bugsCount;
      }
    });
    if (overAllBugsCount > 0) {
      reporters[reporterName] = {
        projects: projectBugCounts,
        overAllBugsCount,
      };
    }
  });

  const developers = {};
  developerNames.forEach((developerName) => {
    let overAllBugsCount = 0;
    const projectBugCounts = {};
    projectNames.forEach((projectName) => {
      let bugsCount = 0;
      testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
        testedIssueWithBugs.linkedCommentsWithBugs.forEach((linkedCommentWithBugs) => {
          if (
            testedIssueWithBugs.projectName === projectName
            && (linkedCommentWithBugs.lastPreviousDevAssignee?.transitionFromAssignee
              ?? JSONLoader.config.issueWithoutAssignee) === developerName
          ) {
            bugsCount += 1;
          }
        });
      });
      if (bugsCount > 0) {
        projectBugCounts[projectName] = bugsCount;
        overAllBugsCount += bugsCount;
      }
    });
    if (overAllBugsCount > 0) {
      developers[developerName] = {
        projects: projectBugCounts,
        overAllBugsCount,
      };
    }
  });

  const summary = { // generate statistics summary
    issuesCreatedFrom: TimeUtils
      .reformatDateFromYMDToDMY(JSONLoader.config.commentsWithBugsCreatedFromDateYMD),
    issuesCreatedTo: TimeUtils.reformatDateFromISOToDMY(TimeUtils.today()),
    issuesCount: issuesWithCommentsArr.length,
    testedIssuesCount: testedIssuesWithCommentsArr.length,
    testedIssuesWithBugsCount: testedIssuesWithBugsArr.length,
    overallBugsCount,
    bugsCountPerTestedIssueCountRatio: Number((overallBugsCount
      / testedIssuesWithCommentsArr.length).toFixed(2)),
    bugsCountPerTestedIssueWithBugsCountRatio: Number((overallBugsCount
      / testedIssuesWithBugsArr.length).toFixed(2)),
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
