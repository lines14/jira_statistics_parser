/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import JSONLoader from './JSONLoader.js';
import TimeUtils from '../time/timeUtils.js';
import Randomizer from '../random/randomizer.js';

dotenv.config({ override: true });

class DataUtils {
  static saveToJSON(obj, options = { folder: 'artifacts' }) {
    const [name] = Object.keys(obj);
    const data = obj[name];
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./${options.folder}/${name}.json`, JSON.stringify(data, replacer, 4));
  }

  static getDeveloperNamesByAccountIDs(users) {
    const developerAccountIDs = JSON.parse(process.env.DEVELOPERS)
      .map((el) => Object.values(el).pop());

    return users.filter((user) => developerAccountIDs
      .some((ID) => user.accountId === ID))
      .map((user) => user.displayName);
  }

  static getReporterNamesByAccountIDs(users) {
    const reporterAccountIDs = JSON.parse(process.env.REPORTERS)
      .map((el) => Object.values(el).pop());

    return users.filter((user) => reporterAccountIDs
      .some((ID) => user.accountId === ID))
      .map((user) => user.displayName);
  }

  static getFile(filePath) {
    return fs.readFileSync(filePath);
  }

  static getFileNames(dirObj) {
    return dirObj.fileObjects.map((fileObj) => fileObj.file.split('/').pop());
  }

  static getFilePaths(dirObj) {
    return dirObj.fileObjects.map((fileObj) => `${dirObj.dirPath}/${fileObj.file}`);
  }

  static getFileBuffers(filePaths) {
    return filePaths.map((filePath) => this.getFile(path.resolve(filePath)));
  }

  static getFileNameGroups(filePaths) {
    return filePaths.map((filePath) => filePath.split('/').slice(3))
      .map((filePath) => ({
        name: filePath.pop(),
        group: filePath.length > 1 ? filePath.join('/') : filePath.pop() ?? 'root',
      })).reduce((acc, item) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item.name);
        return acc;
      }, {});
  }

  static createMarkupExpandBlock(nestedMarkup) {
    return `<ac:structured-macro ac:name="expand">
      <ac:parameter ac:name="title">Раскрыть диаграммы</ac:parameter>
      <ac:rich-text-body>
        ${nestedMarkup}
      </ac:rich-text-body>
    </ac:structured-macro>`;
  }

  static createMarkupImage(fileName) {
    return `<ac:image ac:height="auto" ac:width="1000"><ri:attachment ri:filename="${fileName}" /></ac:image>\n`;
  }

  static createMarkupAttachmentTable(fileName) {
    return `<p>Файл с метриками, из которого генерировались диаграммы:</p>
    <div style="max-width: 1000px; overflow-x: auto;">
      <ac:structured-macro ac:name="attachments">
        <ac:parameter ac:name="patterns">${fileName}</ac:parameter>
        <ac:parameter ac:name="upload">false</ac:parameter>
        <ac:parameter ac:name="sortBy">date</ac:parameter>
      </ac:structured-macro>
    </div>`;
  }

  static generateMarkup(fileNameGroups) {
    const zippedSuperGroups = {};

    let markup = this.createMarkupAttachmentTable(fileNameGroups.root.shift());

    let projectsWithTheirDevelopers = JSONLoader.config.markupSuperGroups
      .projectsWithTheirDevelopers.map((el) => fileNameGroups[el]);
    projectsWithTheirDevelopers = projectsWithTheirDevelopers[0]
      .map((_, i) => projectsWithTheirDevelopers.map((row) => row[i])).flat();
    zippedSuperGroups.projectsWithTheirDevelopers = projectsWithTheirDevelopers;

    let projectsWithTheirQA = JSONLoader.config.markupSuperGroups
      .projectsWithTheirQA.map((el) => fileNameGroups[el]);
    projectsWithTheirQA = projectsWithTheirQA[0]
      .map((_, i) => projectsWithTheirQA.map((row) => row[i])).flat();
    zippedSuperGroups.projectsWithTheirQA = projectsWithTheirQA;

    let developersWithTheirProjects = JSONLoader.config.markupSuperGroups
      .developersWithTheirProjects.map((el) => fileNameGroups[el]);
    developersWithTheirProjects = developersWithTheirProjects[0]
      .map((_, i) => developersWithTheirProjects.map((row) => row[i])).flat();
    zippedSuperGroups.developersWithTheirProjects = developersWithTheirProjects;

    let QAWithTheirProjects = JSONLoader.config.markupSuperGroups
      .QAWithTheirProjects.map((el) => fileNameGroups[el]);
    QAWithTheirProjects = QAWithTheirProjects[0]
      .map((_, i) => QAWithTheirProjects.map((row) => row[i])).flat();
    zippedSuperGroups.QAWithTheirProjects = QAWithTheirProjects;

    let issueTypesInProjects = JSONLoader.config.markupSuperGroups
      .issueTypesInProjects.map((el) => fileNameGroups[el]);
    issueTypesInProjects = issueTypesInProjects[0]
      .map((_, i) => issueTypesInProjects.map((row) => row[i])).flat();
    zippedSuperGroups.issueTypesInProjects = issueTypesInProjects;

    for (const [superGroup, groups] of Object.entries(JSONLoader.config.markupSuperGroups)) {
      let nestedMarkup = '';

      markup += `<h1>${JSONLoader.config.markupSuperGroupCyrillicNames[superGroup]}</h1>\n`;

      if (superGroup in zippedSuperGroups) {
        for (const fileName of zippedSuperGroups[superGroup]) {
          nestedMarkup += this.createMarkupImage(fileName);
        }

        markup += this.createMarkupExpandBlock(nestedMarkup);
      } else {
        for (const group of groups) {
          for (const fileName of fileNameGroups[group]) {
            markup += this.createMarkupImage(fileName);
          }
        }
      }
    }

    return markup;
  }

  static splitArrIntoChunks(array, args = { partsCount: 8 }) {
    const result = [];
    const chunkSize = Math.ceil(array.length / args.partsCount);

    for (let i = 0; i < args.partsCount; i += 1) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      result.push(array.slice(start, end));
    }

    return result;
  }

  static sortByTimestamps(changelog) {
    return changelog.sort((a, b) => TimeUtils.convertTimestampToDateObject(a.created)
    - TimeUtils.convertTimestampToDateObject(b.created));
  }

  static convertTimestampsToDateObjects(changelogItems) {
    changelogItems.forEach((changelogItem) => {
      changelogItem.created = TimeUtils
        .convertTimestampToDateObject(changelogItem.created);
    });
  }

  static getTimeIntervals(changelogItems) {
    const timeIntervals = [];
    for (let i = 0; i < changelogItems.length - 1; i += 1) {
      timeIntervals.push([changelogItems[i], changelogItems[i + 1]]);
    }

    return timeIntervals;
  }

  static createInitialTimestamp(sortedChangelog) {
    return {
      transitionFrom: JSONLoader.config.initIssueStatus,
      created: TimeUtils.convertTimestampToDateObject(sortedChangelog[0].created),
    };
  }

  static markAssignedEntitiesLessThanHalfMinute(assignedEntityChanges) {
    assignedEntityChanges.forEach((assignedEntityChange, index, arr) => {
      if (index === 0) {
        assignedEntityChange.assignedLessThanHalfMinute = false;
      } else {
        const prev = arr[index - 1];
        const diff = assignedEntityChange.created - prev.created;
        if (diff >= JSONLoader.config.halfMinute) {
          assignedEntityChange.assignedLessThanHalfMinute = false;
        } else {
          assignedEntityChange.assignedLessThanHalfMinute = true;
        }
      }
    });
  }

  // get assignee with status overlapping indicator
  static getAssigneeWithStatus(
    [startFirstInterval, endFirstInterval],
    [startSecondInterval, endSecondInterval],
  ) {
    const overlapStart = new Date(Math.max(
      startFirstInterval.created,
      startSecondInterval.created,
    ));
    const overlapEnd = new Date(Math.min(
      endFirstInterval.created,
      endSecondInterval.created,
    ));
    const overlapDuration = overlapEnd - overlapStart;
    const overlap = startFirstInterval.created <= endSecondInterval.created
    && startSecondInterval.created <= endFirstInterval.created;

    return {
      transitionFromStatus: endFirstInterval.transitionFrom,
      transitionFromAssignee: endSecondInterval.transitionFrom,
      transitionToStatus: endFirstInterval.transitionTo,
      transitionToAssignee: endSecondInterval.transitionTo,
      overlap,
      overlapDuration,
      createdTransitionFromStatus: endFirstInterval.created,
      createdTransitionFromAssignee: endSecondInterval.created,
      transitionStatusID: endFirstInterval.ID,
      transitionAssigneeID: endSecondInterval.ID,
      assignedLessThanHalfMinuteStatus: endFirstInterval.assignedLessThanHalfMinute,
      assignedLessThanHalfMinuteAssignee: endSecondInterval.assignedLessThanHalfMinute,
    };
  }

  // recursively get comments with bugs
  static filterCommentsWithBugs(data, commentCreated, commentAuthor) {
    const results = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        results.push(...this.filterCommentsWithBugs(item, commentCreated, commentAuthor));
      }
    } else if (data !== null && typeof data === 'object') {
      if (data.created) commentCreated = data.created;
      if (data.author) commentAuthor = data.author.displayName;
      if (data.type === 'status'
        && JSONLoader.config.commentStatuses.includes(data.attrs.text.toUpperCase())) {
        if (commentCreated) data.commentCreated = commentCreated;
        if (commentAuthor) data.commentAuthor = commentAuthor;
        results.push(data);
      }

      for (const key in data) {
        if (Object.hasOwn(data, key)) {
          results.push(...this.filterCommentsWithBugs(
            data[key],
            commentCreated,
            commentAuthor,
          ));
        }
      }
    }

    return results;
  }

  // get issue field changes from changelog
  static getFieldChanges(fieldName, changelog) {
    const fieldChanges = [];
    for (const element of changelog) {
      element.items.forEach((item) => {
        if (item.field === fieldName && item.fromString) {
          fieldChanges.push({
            transitionFrom: item.fromString,
            transitionTo: item.toString,
            created: element.created,
            ID: Randomizer.getRandomString(false, false, true, false, false, 20, 20),
          });
        }
      });
    }

    // filter if field assigned more than half minute
    this.convertTimestampsToDateObjects(fieldChanges);
    this.markAssignedEntitiesLessThanHalfMinute(fieldChanges);
    return fieldChanges;
  }

  // get backlog statuses ends to filter initial JQL query results by last transition date
  static getBacklogStatusEnds(changelog) {
    return this.sortByTimestamps(this.getFieldChanges('status', changelog)
      .filter((statusChange) => JSONLoader.config.backlogStatus === statusChange.transitionFrom
        .toUpperCase()));
  }

  static filterLastTransitionDateFromBacklogIncluded(dateBegin, issuesArr) {
    const dateBeginTimestamp = TimeUtils.reformatDateFromYMDToISO(dateBegin);
    return issuesArr.filter((issue) => {
      const backlogStatuses = DataUtils.getBacklogStatusEnds(issue.changelog.histories);
      return TimeUtils.convertTimestampToDateObject(dateBeginTimestamp) <= backlogStatuses.pop()
        .created;
    });
  }

  // get issue statuses ends to calculate time intervals
  static getDevStatusEnds(changelog) {
    return this.getFieldChanges('status', changelog)
      .filter((statusChange) => JSONLoader.config.devIssueStatuses
        .includes(statusChange.transitionFrom.toUpperCase()));
  }

  static getTestStatusEnds(changelog) {
    return this.getFieldChanges('status', changelog)
      .filter((statusChange) => JSONLoader.config.testIssueStatuses
        .includes(statusChange.transitionFrom.toUpperCase()));
  }

  // get issue assignees changes to calculate time intervals
  static getDeveloperChanges(changelog, developerNamesByAccountIDs) {
    return this.getFieldChanges('assignee', changelog)
      .filter((assigneeChange) => developerNamesByAccountIDs
        .includes(assigneeChange.transitionFrom));
  }

  static getReporterChanges(changelog, reporterNamesByAccountIDs) {
    return this.getFieldChanges('assignee', changelog)
      .filter((assigneeChange) => reporterNamesByAccountIDs
        .includes(assigneeChange.transitionTo));
  }

  // get overlapping assignees with statuses
  static getAssigneesWithStatuses(
    statusChanges,
    assigneeChanges,
    initialTimestamp,
  ) {
    statusChanges.unshift(initialTimestamp);
    assigneeChanges.unshift(initialTimestamp);

    // get time intervals between statuses changes
    const statusChangeTimeIntervals = this.getTimeIntervals(statusChanges);

    // get time intervals between assignees changes
    const assigneeChangeTimeIntervals = this.getTimeIntervals(assigneeChanges);

    // get assignees with statuses at the same and longest amount of time
    return statusChangeTimeIntervals
      .map((statusChangeTimeInterval) => assigneeChangeTimeIntervals
        .map((assigneeChangeTimeInterval) => this
          .getAssigneeWithStatus(statusChangeTimeInterval, assigneeChangeTimeInterval)))
      .map((assigneeWithStatus) => [assigneeWithStatus
        .reduce((overlappedAssignee, currentElement) => {
          if (!overlappedAssignee
            || (currentElement.overlapDuration
              ?? 0) > (overlappedAssignee.overlapDuration ?? 0)) {
            return currentElement;
          }

          return overlappedAssignee;
        }, null)]
        .filter((nestedAssigneeWithStatus) => nestedAssigneeWithStatus?.overlap)
        .filter((nestedAssigneeWithStatus) => !nestedAssigneeWithStatus
          .assignedLessThanHalfMinuteStatus
        && !nestedAssigneeWithStatus.assignedLessThanHalfMinuteAssignee));
  }

  // search previous developer assignee before bug found
  static linkDevelopersWithBugs(testedIssue, developerNamesByAccountIDs) {
    if (testedIssue.commentsWithBugs.length) {
      return testedIssue.commentsWithBugs.map((commentWithBug) => {
        const linkedAssigneeWithBug = { ...commentWithBug };
        const sortedChangelog = this.sortByTimestamps(testedIssue.changelog);
        const initialTimestamp = this.createInitialTimestamp(sortedChangelog);

        // get dev status ends from issue history
        const devStatusEnds = this.getDevStatusEnds(sortedChangelog);

        // get developer assignee changes from issue history
        const developerChanges = this.getDeveloperChanges(
          sortedChangelog,
          developerNamesByAccountIDs,
        );

        // filter not includes issues with only one assignee or status due to lack of transition
        // and get developer assignees with dev statuses at the same time
        if (developerChanges.length && devStatusEnds.length) {
          const overlappedAssignees = this.getAssigneesWithStatuses(
            devStatusEnds,
            developerChanges,
            initialTimestamp,
          ).flat();

          const uniqueOverlappedAssignees = this
            .getUniqueOverlappedAssignees(overlappedAssignees);

          const overlappedAssigneesInProgress = this
            .getOverlappedAssigneesInProgress(overlappedAssignees);

          const uniqueOverlappedAssigneesInProgress = this
            .getUniqueOverlappedAssignees(overlappedAssigneesInProgress);

          const overlappedAssigneesInReopenOrInProgress = this
            .getOverlappedAssigneesInReopenOrInProgress(overlappedAssignees);

          const uniqueOverlappedAssigneesInReopenOrInProgress = this
            .getUniqueOverlappedAssignees(overlappedAssigneesInReopenOrInProgress);

          // search and use only developers in IN PROGRESS and in REOPEN statuses
          // if IN PROGRESS exist else in BACKLOG and TO DO statuses too
          let devAssignees;
          if (!uniqueOverlappedAssigneesInProgress.length) {
            devAssignees = uniqueOverlappedAssignees;
          } else {
            devAssignees = uniqueOverlappedAssigneesInReopenOrInProgress;
          }

          linkedAssigneeWithBug.devAssignees = devAssignees;
        }

        return linkedAssigneeWithBug;
      });
    }

    return [];
  }

  static getIssueDevelopers(testedIssue, developerNamesByAccountIDs) {
    if (testedIssue.changelog.length) {
      const sortedChangelog = this.sortByTimestamps(testedIssue.changelog);
      const initialTimestamp = this.createInitialTimestamp(sortedChangelog);

      // get dev status ends from issue history
      const devStatusEnds = this.getDevStatusEnds(sortedChangelog);

      // get developer assignee changes from issue history
      const developerChanges = this.getDeveloperChanges(
        sortedChangelog,
        developerNamesByAccountIDs,
      );

      // get developer assignees with dev statuses at the same time
      const overlappedAssignees = this.getAssigneesWithStatuses(
        devStatusEnds,
        developerChanges,
        initialTimestamp,
      ).flat();

      const overlappedAssigneesInProgress = this
        .getOverlappedAssigneesInProgress(overlappedAssignees);

      const uniqueOverlappedAssigneesInProgress = this
        .getUniqueOverlappedAssignees(overlappedAssigneesInProgress);

      const overlappedAssigneesInReopen = this
        .getOverlappedAssigneesInReopen(overlappedAssignees);

      const uniqueOverlappedAssigneesInReopen = this
        .getUniqueOverlappedAssignees(overlappedAssigneesInReopen);

      const overlappedAssigneesInReopenOrInProgress = this
        .getOverlappedAssigneesInReopenOrInProgress(overlappedAssignees);

      // search and use only developers in IN PROGRESS or in REOPEN statuses if exist
      // else in BACKLOG or TO DO statuses
      if (!overlappedAssigneesInReopenOrInProgress.length
        || (!uniqueOverlappedAssigneesInProgress.length
          && uniqueOverlappedAssigneesInReopen.length === 1)) {
        return overlappedAssignees;
      }
      return overlappedAssigneesInReopenOrInProgress;
    }
    return [];
  }

  static getIssueReporters(testedIssue, reporterNamesByAccountIDs) {
    if (testedIssue.changelog.length) {
      const sortedChangelog = this.sortByTimestamps(testedIssue.changelog);
      const initialTimestamp = this.createInitialTimestamp(sortedChangelog);

      // get test status starts from issue history
      const testStatusEnds = this.getTestStatusEnds(sortedChangelog);

      // get reporter assignee changes from issue history
      const reporterChanges = this.getReporterChanges(sortedChangelog, reporterNamesByAccountIDs);

      // get reporter assignees with test statuses at the same time
      return this.getAssigneesWithStatuses(
        testStatusEnds,
        reporterChanges,
        initialTimestamp,
      ).flat();
    }
    return [];
  }

  static getOverlappedAssigneesInProgress(overlappedAssignees) {
    return overlappedAssignees
      .filter((overlappedAssignee) => overlappedAssignee.transitionFromStatus
        .toUpperCase() === JSONLoader.config.inProgressStatus);
  }

  static getOverlappedAssigneesInReopen(overlappedAssignees) {
    return overlappedAssignees
      .filter((overlappedAssignee) => overlappedAssignee.transitionFromStatus
        .toUpperCase() === JSONLoader.config.reopenStatus);
  }

  static getOverlappedAssigneesInReopenOrInProgress(overlappedAssignees) {
    return overlappedAssignees
      .filter((overlappedAssignee) => overlappedAssignee.transitionFromStatus
        .toUpperCase() === JSONLoader.config.inProgressStatus
        || overlappedAssignee.transitionFromStatus
          .toUpperCase() === JSONLoader.config.reopenStatus);
  }

  static getUniqueOverlappedAssignees(overlappedAssignees) {
    return [...overlappedAssignees]
      .reverse()
      .filter((overlappedAssignee, index, arr) => arr
        .findIndex((el) => el.transitionFromAssignee === overlappedAssignee
          .transitionFromAssignee) === index)
      .reverse();
  }

  static fillBugsAndIssuesPerEntities(
    accumulator,
    issuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    key,
    entityNames,
    overallBugsCount,
  ) { // get or calculate values for each entity
    entityNames.forEach((el) => {
      let bugsCount = 0;

      const issuesCount = issuesWithCommentsArr
        .filter((issueWithComments) => issueWithComments[key] === el).length;

      const testedIssuesCount = testedIssuesWithCommentsArr
        .filter((testedIssueWithComments) => testedIssueWithComments[key] === el).length;

      const testedIssuesWithBugsCount = testedIssuesWithBugsArr
        .filter((testedIssueWithBugs) => testedIssueWithBugs[key] === el).length;

      testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
        if (testedIssueWithBugs[key] === el) {
          bugsCount += testedIssueWithBugs.bugsCount;
        }
      });

      if (issuesCount > 0) {
        accumulator[el] = { issuesCount };
      }

      if (testedIssuesCount > 0) {
        accumulator[el].testedIssuesCount = testedIssuesCount;
      }

      if (testedIssuesWithBugsCount > 0) {
        accumulator[el].testedIssuesWithBugsCount = testedIssuesWithBugsCount;
      }

      if (bugsCount > 0) {
        accumulator[el].bugsCount = bugsCount;
      }

      if (issuesCount > 0 && testedIssuesCount > 0) {
        const testedIssuesCountPerIssueCountRatio = Number((testedIssuesCount
        / issuesCount).toFixed(JSONLoader.config.decimalPlaces));
        accumulator[el].testedIssuesCountPerIssueCountRatio = testedIssuesCountPerIssueCountRatio;
      }

      if (bugsCount > 0 && testedIssuesCount > 0) {
        const bugsCountPerTestedIssueCountRatio = Number((bugsCount
        / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
        accumulator[el].bugsCountPerTestedIssueCountRatio = bugsCountPerTestedIssueCountRatio;
      }

      if (bugsCount > 0 && testedIssuesWithBugsCount > 0) {
        const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
        / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
        accumulator[el]
          .bugsCountPerTestedIssueWithBugsCountRatio = bugsCountPerTestedIssueWithBugsCountRatio;
      }

      if (bugsCount > 0 && overallBugsCount > 0) {
        const bugsCountPerOverallBugsCountRatio = Number((bugsCount
          / overallBugsCount).toFixed(JSONLoader.config.decimalPlaces));
        accumulator[el].bugsCountPerOverallBugsCountRatio = bugsCountPerOverallBugsCountRatio;
      }
    });
  }

  // get unique developers from each issue
  static getDevelopersWorkload(issuesArr, developerNamesByAccountIDs) {
    return issuesArr
      .filter((issue) => !JSONLoader.config.debugIssues
        .includes(issue.key))
      .map((issue) => {
        const assignees = [
          ...new Set(DataUtils.getIssueDevelopers(issue, developerNamesByAccountIDs)
            .map((assignee) => assignee.transitionFromAssignee)),
        ];

        return {
          projectName: issue.projectName,
          assignees: assignees.length
            ? assignees
            : [JSONLoader.config.issueWithoutAssignee],
        };
      });
  }

  // get unique reporters from each issue
  static getReportersWorkload(issuesArr, reporterNamesByAccountIDs) {
    return issuesArr
      .filter((issue) => !JSONLoader.config.debugIssues
        .includes(issue.key))
      .map((issue) => {
        const assignees = [...new Set(DataUtils.getIssueReporters(issue, reporterNamesByAccountIDs)
          .map((assignee) => assignee.transitionToAssignee))];

        return {
          projectName: issue.projectName,
          assignees: assignees.length
            ? assignees
            : [JSONLoader.config.issueWithoutAssignee],
        };
      });
  }

  static averageRatio(ratiosArr) {
    return Number((ratiosArr.reduce((sum, val) => sum + val, 0)
    / ratiosArr.length).toFixed(JSONLoader.config.decimalPlaces));
  }

  static fillBugsAndIssuesPerAssignees(
    accumulator,
    issuesWithAssigneesArr,
    testedIssuesWithBugsArr,
    testedIssuesWithAssigneesArr,
    testedIssuesWithBugsAndAssigneesArr,
    projectNames,
    assigneeNames,
    overallBugsCount,
    options = { withDevAssignees: true },
  ) { // get or calculate values for each assignee in each project scope
    assigneeNames.forEach((el) => {
      let allBugsCount = 0;
      let allAffBugsCount = 0;
      let allIssuesCount = 0;
      let allTestedIssuesCount = 0;
      let allTestedIssuesWithBugsCount = 0;
      let allBugsCountPerOverallBugsCountRatio = 0;
      let allAffBugsCountPerOverallBugsCountRatio = 0;
      const bugsCountPerTestedIssueCountRatios = [];
      const bugsCountPerTestedIssueWithBugsCountRatios = [];
      const affBugsCountPerTestedIssueCountRatios = [];
      const affBugsCountPerTestedIssueWithBugsCountRatios = [];
      const projectBugCounts = {};

      projectNames.forEach((projectName) => {
        let bugsCount = 0;
        let affBugsCount = 0;
        let issuesCount = 0;
        let testedIssuesCount = 0;
        let testedIssuesWithBugsCount = 0;

        testedIssuesWithBugsArr
          .filter((testedIssueWithBugs) => testedIssueWithBugs.projectName === projectName)
          .forEach((testedIssueWithBugs) => {
            testedIssueWithBugs.linkedCommentsWithBugs.forEach((linkedCommentWithBugs) => {
              if (options.withDevAssignees) {
                const devAssignees = linkedCommentWithBugs.devAssignees ?? [];

                if (devAssignees.length > 1) {
                  devAssignees.forEach((devAssignee) => {
                    if (devAssignee.transitionFromAssignee === el) {
                      affBugsCount += 1;
                    }
                  });
                } else if (devAssignees.length === 1) {
                  if (devAssignees[0].transitionFromAssignee === el) {
                    bugsCount += 1;
                  }
                } else if (JSONLoader.config.issueWithoutAssignee === el) {
                  bugsCount += 1;
                }
              } else if (linkedCommentWithBugs.commentAuthor === el) {
                bugsCount += 1;
              }
            });
          });

        issuesWithAssigneesArr.forEach((issueWithAssignees) => {
          if (issueWithAssignees.projectName === projectName) {
            issueWithAssignees.assignees.forEach((assignee) => {
              if (assignee === el) {
                issuesCount += 1;
              }
            });
          }
        });

        testedIssuesWithAssigneesArr.forEach((testedIssueWithAssignees) => {
          if (testedIssueWithAssignees.projectName === projectName) {
            testedIssueWithAssignees.assignees.forEach((assignee) => {
              if (assignee === el) {
                testedIssuesCount += 1;
              }
            });
          }
        });

        testedIssuesWithBugsAndAssigneesArr.forEach((testedIssueWithBugsAndAssignees) => {
          if (testedIssueWithBugsAndAssignees.projectName === projectName) {
            testedIssueWithBugsAndAssignees.assignees.forEach((assignee) => {
              if (assignee === el) {
                testedIssuesWithBugsCount += 1;
              }
            });
          }
        });

        if (issuesCount > 0
          || testedIssuesCount > 0
          || testedIssuesWithBugsCount > 0
          || bugsCount > 0
          || affBugsCount > 0) {
          projectBugCounts[projectName] = {};
        }

        if (issuesCount > 0) {
          projectBugCounts[projectName].issuesCount = issuesCount;
          allIssuesCount += issuesCount;
        }

        if (testedIssuesCount > 0) {
          projectBugCounts[projectName].testedIssuesCount = testedIssuesCount;
          allTestedIssuesCount += testedIssuesCount;
        }

        if (testedIssuesWithBugsCount > 0) {
          projectBugCounts[projectName].testedIssuesWithBugsCount = testedIssuesWithBugsCount;
          allTestedIssuesWithBugsCount += testedIssuesWithBugsCount;
        }

        if (bugsCount > 0) {
          projectBugCounts[projectName].bugsCount = bugsCount;
          allBugsCount += bugsCount;
        }

        if (affBugsCount > 0) {
          projectBugCounts[projectName].affBugsCount = affBugsCount;
          allAffBugsCount += affBugsCount;
        }

        if (issuesCount > 0 && testedIssuesCount > 0) {
          const testedIssuesCountPerIssueCountRatio = Number((testedIssuesCount
            / issuesCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .testedIssuesCountPerIssueCountRatio = testedIssuesCountPerIssueCountRatio;
        }

        if (testedIssuesCount > 0 && bugsCount > 0) {
          const bugsCountPerTestedIssueCountRatio = Number((bugsCount
            / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .bugsCountPerTestedIssueCountRatio = bugsCountPerTestedIssueCountRatio;
          bugsCountPerTestedIssueCountRatios.push(bugsCountPerTestedIssueCountRatio);
        }

        if (testedIssuesCount > 0 && affBugsCount > 0) {
          const affBugsCountPerTestedIssueCountRatio = Number((affBugsCount
            / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .affBugsCountPerTestedIssueCountRatio = affBugsCountPerTestedIssueCountRatio;
          affBugsCountPerTestedIssueCountRatios.push(affBugsCountPerTestedIssueCountRatio);
        }

        if (testedIssuesWithBugsCount > 0 && bugsCount > 0) {
          const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
            / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .bugsCountPerTestedIssueWithBugsCountRatio = bugsCountPerTestedIssueWithBugsCountRatio;
          bugsCountPerTestedIssueWithBugsCountRatios
            .push(bugsCountPerTestedIssueWithBugsCountRatio);
        }

        if (testedIssuesWithBugsCount > 0 && affBugsCount > 0) {
          const affBgsCntPerTestedIssueWithBugsCntRatio = Number((affBugsCount
            / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .affBugsCountPerTestedIssueWithBugsCountRatio = affBgsCntPerTestedIssueWithBugsCntRatio;
          affBugsCountPerTestedIssueWithBugsCountRatios
            .push(affBgsCntPerTestedIssueWithBugsCntRatio);
        }

        if (bugsCount > 0 && overallBugsCount > 0) {
          const bugsCountPerOverallBugsCountRatio = Number((bugsCount
            / overallBugsCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .bugsCountPerOverallBugsCountRatio = bugsCountPerOverallBugsCountRatio;
          allBugsCountPerOverallBugsCountRatio += bugsCountPerOverallBugsCountRatio;
        }

        if (affBugsCount > 0 && overallBugsCount > 0) {
          const affBugsCountPerOverallBugsCountRatio = Number((affBugsCount
            / overallBugsCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .affBugsCountPerOverallBugsCountRatio = affBugsCountPerOverallBugsCountRatio;
          allAffBugsCountPerOverallBugsCountRatio += affBugsCountPerOverallBugsCountRatio;
        }
      });

      accumulator[el] = {
        projects: projectBugCounts,
      };

      if (allIssuesCount > 0) {
        accumulator[el].allIssuesCount = allIssuesCount;
      }

      if (allTestedIssuesCount > 0) {
        accumulator[el].allTestedIssuesCount = allTestedIssuesCount;
      }

      if (allTestedIssuesWithBugsCount > 0) {
        accumulator[el].allTestedIssuesWithBugsCount = allTestedIssuesWithBugsCount;
      }

      if (allBugsCount > 0) {
        accumulator[el].allBugsCount = allBugsCount;
      }

      if (allAffBugsCount > 0) {
        accumulator[el].allAffBugsCount = allAffBugsCount;
      }

      if (allIssuesCount > 0 && allTestedIssuesCount > 0) {
        accumulator[el].allTestedIssuesCountPerAllIssueCountRatio = Number((allTestedIssuesCount
          / allIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allBugsCountPerOverallBugsCountRatio > 0) {
        accumulator[el]
          .allBugsCountPerOverallBugsCountRatio = Number(allBugsCountPerOverallBugsCountRatio
            .toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allAffBugsCountPerOverallBugsCountRatio > 0) {
        accumulator[el].allAffBugsCountPerOverallBugsCountRatio = Number(
          allAffBugsCountPerOverallBugsCountRatio
            .toFixed(JSONLoader.config.decimalPlaces),
        );
      }

      if (allBugsCount > 0 && allTestedIssuesCount > 0) {
        accumulator[el].allBugsCountPerAllTestedIssueCountRatio = Number((allBugsCount
          / allTestedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allAffBugsCount > 0 && allTestedIssuesCount > 0) {
        accumulator[el].allAffBugsCountPerAllTestedIssueCountRatio = Number((allAffBugsCount
          / allTestedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allBugsCount > 0 && allTestedIssuesWithBugsCount > 0) {
        accumulator[el].allBugsCountPerAllTestedIssueWithBugsCountRatio = Number((allBugsCount
          / allTestedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allAffBugsCount > 0 && allTestedIssuesWithBugsCount > 0) {
        accumulator[el].allAffBugsCountPerAllTestedIssueWithBugsCountRatio = Number((allAffBugsCount
          / allTestedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allTestedIssuesCount > 0 && allBugsCount > 0) {
        accumulator[el].bugsCountPerTestedIssueCountAverageRatio = DataUtils
          .averageRatio(bugsCountPerTestedIssueCountRatios);
      }

      if (allTestedIssuesCount > 0 && allAffBugsCount > 0) {
        accumulator[el].affBugsCountPerTestedIssueCountAverageRatio = DataUtils
          .averageRatio(affBugsCountPerTestedIssueCountRatios);
      }

      if (allTestedIssuesWithBugsCount > 0 && allBugsCount > 0) {
        accumulator[el].bugsCountPerTestedIssueWithBugsCountAverageRatio = DataUtils
          .averageRatio(bugsCountPerTestedIssueWithBugsCountRatios);
      }

      if (allTestedIssuesWithBugsCount > 0 && allAffBugsCount > 0) {
        accumulator[el].affBugsCountPerTestedIssueWithBugsCountAverageRatio = DataUtils
          .averageRatio(affBugsCountPerTestedIssueWithBugsCountRatios);
      }
    });
  }

  // get values from summary
  static extractPropertyByName(obj, ...propertyNames) {
    const result = {};
    if (typeof obj !== 'object' || obj === null) return { result, propertyNames };
    const isFlat = propertyNames.some((p) => p in obj);
    if (isFlat) {
      for (const prop of propertyNames) {
        if (prop in obj) {
          result[prop] = obj[prop];
        }
      }
      return { result, propertyNames };
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        const filtered = {};
        for (const prop of propertyNames) {
          if (prop in value) filtered[prop] = value[prop];
        }
        if (Object.keys(filtered).length > 0) {
          result[key] = filtered;
        }
      }
    }

    return { result, propertyNames };
  }

  // map summary keys to cyrillic diagram names
  static setCyrillicNames(obj, namesMapping) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.setCyrillicNames(item, namesMapping));
    } if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = namesMapping[key] || key;
        newObj[newKey] = this.setCyrillicNames(value, namesMapping);
      }

      return newObj;
    }

    return obj;
  }

  // convert assignees summary from assignees to projects scope
  static convertAssigneesToProjectsStructure(obj) {
    const result = {};
    for (const [assignee, data] of Object.entries(obj)) {
      const projects = data.projects || {};
      for (const [project, projectData] of Object.entries(projects)) {
        if (!result[project]) {
          result[project] = { assignees: {} };
        }

        result[project].assignees[assignee] = { ...projectData };
      }
    }

    return result;
  }

  static getProjectsUnassignedIssuesCount(projectAssignees) {
    const result = {};
    for (const [projectName, project] of Object.entries(projectAssignees)) {
      const { unassigned } = project.assignees;
      result[projectName] = unassigned?.issuesCount || 0;
    }

    return result;
  }

  static setUnassignedIssuesCountToProjects(
    projects,
    projectUnassignedIssuesCount,
    options = { developer: false },
  ) {
    const countFieldName = options.developer
      ? 'developersUnassignedAllIssuesCount'
      : 'reportersUnassignedAllIssuesCount';

    const ratioFieldName = options.developer
      ? 'developersUnassignedAllIssuesCountPerIssuesCount'
      : 'reportersUnassignedAllIssuesCountPerIssuesCount';

    for (const [projectName, project] of Object.entries(projects)) {
      for (const [name, count] of Object.entries(projectUnassignedIssuesCount)) {
        if (projectName === name && count) {
          project[countFieldName] = count;
          project[ratioFieldName] = Number((count
          / project.issuesCount).toFixed(JSONLoader.config.decimalPlaces));
        }
      }
    }
  }

  static fillEntitiesPerProjects(
    projects,
    issuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    key,
    entityNames,
    overallBugsCount,
  ) {
    for (const project in projects) {
      if (Object.hasOwn(projects, project)) {
        const entitiesInProject = {};

        const filteredIssuesWithCommentsArr = issuesWithCommentsArr
          .filter((issueWithComments) => issueWithComments.projectName === project);
        const filteredTestedIssuesWithCommentsArr = testedIssuesWithCommentsArr
          .filter((testedIssueWithComments) => testedIssueWithComments.projectName === project);
        const filteredTestedIssuesWithBugsArr = testedIssuesWithBugsArr
          .filter((testedIssueWithBugs) => testedIssueWithBugs.projectName === project);

        this.fillBugsAndIssuesPerEntities(
          entitiesInProject,
          filteredIssuesWithCommentsArr,
          filteredTestedIssuesWithCommentsArr,
          filteredTestedIssuesWithBugsArr,
          key,
          entityNames,
          overallBugsCount,
        );

        projects[project][key] = entitiesInProject;
      }
    }
  }

  static getReopenedIssuesWithReopensCount(issuesArr) {
    return issuesArr.map((issue) => {
      const issueWithCounter = structuredClone(issue);
      issueWithCounter.reopensCount = issueWithCounter.changelog
        .reduce((count, changelogItem) => count + changelogItem.items
          .filter((item) => item.toString?.toUpperCase() === JSONLoader.config.reopenStatus)
          .length, 0);

      return issueWithCounter;
    }).filter((issue) => issue.reopensCount > 0);
  }
}

export default DataUtils;
