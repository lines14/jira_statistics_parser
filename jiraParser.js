/* eslint-disable no-await-in-loop */
/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import jiraAPI from './modules/API/jiraAPI.js';
import DataUtils from './modules/main/utils/data/dataUtils.js';
import TimeUtils from './modules/main/utils/time/timeUtils.js';
import ImageUtils from './modules/main/utils/image/imageUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';

const parseIssues = async () => { // get Jira issues with comments
  const toDate = JSONLoader.config.commentsWithBugsCreatedToDateYMD 
    ? JSONLoader.config.commentsWithBugsCreatedToDateYMD 
    : TimeUtils
    .reformatDateFromDMYToYMD(TimeUtils.reformatDateFromISOToDMY(TimeUtils.today()));

  // const issuesArr = await jiraAPI.searchAll(JSONLoader.config.commentsWithBugsCreatedFromDateYMD, toDate);
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
    let overAllTestedIssuesCount = 0;
    let overAllTestedIssuesWithBugsCount = 0;
    const bugsCountPerTestedIssueCountRatios = [];
    const bugsCountPerTestedIssueWithBugsCountRatios = [];
    const projectBugCounts = {};

    projectNames.forEach((projectName) => {
      let bugsCount = 0;
      let testedIssuesCount = 0;
      let testedIssuesWithBugsCount = 0;

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

      testedIssuesWithReportersArr.forEach((testedIssueWithReporters) => {
        if (testedIssueWithReporters.projectName === projectName) {
          testedIssueWithReporters.assignees.forEach((assignee) => {
            if (assignee === reporterName) {
              testedIssuesCount += 1;
            }
          });
        }
      });

      testedIssuesWithBugsAndReportersArr.forEach((testedIssueWithBugsAndReporters) => {
        if (testedIssueWithBugsAndReporters.projectName === projectName) {
          testedIssueWithBugsAndReporters.assignees.forEach((assignee) => {
            if (assignee === reporterName) {
              testedIssuesWithBugsCount += 1;
            }
          });
        }
      });

      if (testedIssuesCount > 0 || testedIssuesWithBugsCount > 0 || bugsCount > 0) {
        projectBugCounts[projectName] = {};
      }

      if (testedIssuesCount > 0) {
        projectBugCounts[projectName].testedIssuesCount = testedIssuesCount;
        overAllTestedIssuesCount += testedIssuesCount;
      }

      if (testedIssuesWithBugsCount > 0) {
        projectBugCounts[projectName].testedIssuesWithBugsCount = testedIssuesWithBugsCount;
        overAllTestedIssuesWithBugsCount += testedIssuesWithBugsCount;
      }

      if (bugsCount > 0) {
        projectBugCounts[projectName] = bugsCount;
        overAllBugsCount += bugsCount;
      }

      if (testedIssuesCount > 0 && bugsCount > 0) {
        const bugsCountPerTestedIssueCountRatio = Number((bugsCount
          / testedIssuesCount).toFixed(2));
        projectBugCounts[projectName]
          .bugsCountPerTestedIssueCountRatio = bugsCountPerTestedIssueCountRatio;
        bugsCountPerTestedIssueCountRatios.push(bugsCountPerTestedIssueCountRatio);
      }

      if (testedIssuesWithBugsCount > 0 && bugsCount > 0) {
        const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
          / testedIssuesWithBugsCount).toFixed(2));
        projectBugCounts[projectName]
          .bugsCountPerTestedIssueWithBugsCountRatio = bugsCountPerTestedIssueWithBugsCountRatio;
        bugsCountPerTestedIssueWithBugsCountRatios.push(bugsCountPerTestedIssueWithBugsCountRatio);
      }
    });

    reporters[reporterName] = {
      projects: projectBugCounts,
    };

    if (overAllTestedIssuesCount > 0) {
      reporters[reporterName].overAllTestedIssuesCount = overAllTestedIssuesCount;
    }

    if (overAllTestedIssuesWithBugsCount > 0) {
      reporters[reporterName].overAllTestedIssuesWithBugsCount = overAllTestedIssuesWithBugsCount;
    }

    if (overAllBugsCount > 0) {
      reporters[reporterName].overAllBugsCount = overAllBugsCount;
    }

    if (overAllTestedIssuesCount > 0 && overAllBugsCount > 0) {
      reporters[reporterName].bugsCountPerTestedIssueCountMeanRatio = DataUtils
        .averageRatio(bugsCountPerTestedIssueCountRatios);
    }

    if (overAllTestedIssuesWithBugsCount > 0 && overAllBugsCount > 0) {
      reporters[reporterName].bugsCountPerTestedIssueWithBugsCountMeanRatio = DataUtils
        .averageRatio(bugsCountPerTestedIssueWithBugsCountRatios);
    }
  });

  const developers = {};
  developerNames.forEach((developerName) => {
    let overAllBugsCount = 0;
    let overAllTestedIssuesCount = 0;
    let overAllTestedIssuesWithBugsCount = 0;
    const bugsCountPerTestedIssueCountRatios = [];
    const bugsCountPerTestedIssueWithBugsCountRatios = [];
    const projectBugCounts = {};

    projectNames.forEach((projectName) => {
      let bugsCount = 0;
      let testedIssuesCount = 0;
      let testedIssuesWithBugsCount = 0;

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

      testedIssuesWithDevelopersArr.forEach((testedIssueWithDevelopers) => {
        if (testedIssueWithDevelopers.projectName === projectName) {
          testedIssueWithDevelopers.assignees.forEach((assignee) => {
            if (assignee === developerName) {
              testedIssuesCount += 1;
            }
          });
        }
      });

      testedIssuesWithBugsAndDevelopersArr.forEach((testedIssueWithBugsAndDevelopers) => {
        if (testedIssueWithBugsAndDevelopers.projectName === projectName) {
          testedIssueWithBugsAndDevelopers.assignees.forEach((assignee) => {
            if (assignee === developerName) {
              testedIssuesWithBugsCount += 1;
            }
          });
        }
      });

      if (testedIssuesCount > 0 || testedIssuesWithBugsCount > 0 || bugsCount > 0) {
        projectBugCounts[projectName] = {};
      }

      if (testedIssuesCount > 0) {
        projectBugCounts[projectName].testedIssuesCount = testedIssuesCount;
        overAllTestedIssuesCount += testedIssuesCount;
      }

      if (testedIssuesWithBugsCount > 0) {
        projectBugCounts[projectName].testedIssuesWithBugsCount = testedIssuesWithBugsCount;
        overAllTestedIssuesWithBugsCount += testedIssuesWithBugsCount;
      }

      if (bugsCount > 0) {
        projectBugCounts[projectName].bugsCount = bugsCount;
        overAllBugsCount += bugsCount;
      }

      if (testedIssuesCount > 0 && bugsCount > 0) {
        const bugsCountPerTestedIssueCountRatio = Number((bugsCount
          / testedIssuesCount).toFixed(2));
        projectBugCounts[projectName]
          .bugsCountPerTestedIssueCountRatio = bugsCountPerTestedIssueCountRatio;
        bugsCountPerTestedIssueCountRatios.push(bugsCountPerTestedIssueCountRatio);
      }

      if (testedIssuesWithBugsCount > 0 && bugsCount > 0) {
        const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
          / testedIssuesWithBugsCount).toFixed(2));
        projectBugCounts[projectName]
          .bugsCountPerTestedIssueWithBugsCountRatio = bugsCountPerTestedIssueWithBugsCountRatio;
        bugsCountPerTestedIssueWithBugsCountRatios.push(bugsCountPerTestedIssueWithBugsCountRatio);
      }
    });

    developers[developerName] = {
      projects: projectBugCounts,
    };

    if (overAllTestedIssuesCount > 0) {
      developers[developerName].overAllTestedIssuesCount = overAllTestedIssuesCount;
    }

    if (overAllTestedIssuesWithBugsCount > 0) {
      developers[developerName].overAllTestedIssuesWithBugsCount = overAllTestedIssuesWithBugsCount;
    }

    if (overAllBugsCount > 0) {
      developers[developerName].overAllBugsCount = overAllBugsCount;
    }

    if (overAllTestedIssuesCount > 0 && overAllBugsCount > 0) {
      developers[developerName].bugsCountPerTestedIssueCountMeanRatio = DataUtils
        .averageRatio(bugsCountPerTestedIssueCountRatios);
    }

    if (overAllTestedIssuesWithBugsCount > 0 && overAllBugsCount > 0) {
      developers[developerName].bugsCountPerTestedIssueWithBugsCountMeanRatio = DataUtils
        .averageRatio(bugsCountPerTestedIssueWithBugsCountRatios);
    }
  });

  const summary = { // generate statistics summary
    issuesCreatedFrom: TimeUtils
      .reformatDateFromYMDToDMY(JSONLoader.config.commentsWithBugsCreatedFromDateYMD),
    issuesCreatedTo: TimeUtils.reformatDateFromYMDToDMY(toDate),
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
