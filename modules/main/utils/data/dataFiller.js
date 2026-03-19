/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import JSONLoader from './JSONLoader.js';
import DataUtils from './dataUtils.js';

class DataFiller {
  static fillBugsAndIssuesPerEntities(
    accumulator,
    issuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    reopenedIssuesWithCommentsArr,
    key,
    entityNames,
    overallBugsCount,
    overallReopensCount,
  ) {
    entityNames.forEach((el) => {
      let bugsCount = 0;
      let reopensCount = 0;

      // get and fill issues count for each entity
      const issuesCount = issuesWithCommentsArr
        .filter((issueWithComments) => issueWithComments[key] === el).length;

      const testedIssuesCount = testedIssuesWithCommentsArr
        .filter((testedIssueWithComments) => testedIssueWithComments[key] === el).length;

      const testedIssuesWithBugsCount = testedIssuesWithBugsArr
        .filter((testedIssueWithBugs) => testedIssueWithBugs[key] === el).length;

      const reopenedIssuesCount = reopenedIssuesWithCommentsArr
        .filter((reopenedIssueWithComments) => reopenedIssueWithComments[key] === el).length;

      accumulator[el] = { issuesCount };

      accumulator[el].testedIssuesCount = testedIssuesCount;

      accumulator[el].testedIssuesWithBugsCount = testedIssuesWithBugsCount;

      accumulator[el].reopenedIssuesCount = reopenedIssuesCount;

      // calculate and fill issues ratio for each entity
      const testedIssuesCountPerIssueCountRatio = Number((testedIssuesCount
          / issuesCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el].testedIssuesCountPerIssueCountRatio = testedIssuesCountPerIssueCountRatio;

      const testedIssuesWithBugsCountPerTestedIssueCountRatio = Number((testedIssuesWithBugsCount
          / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el] // eslint-disable-next-line max-len
        .testedIssuesWithBugsCountPerTestedIssueCountRatio = testedIssuesWithBugsCountPerTestedIssueCountRatio;

      const reopenedIssueCountPerIssueCountRatio = Number((reopenedIssuesCount
          / issuesCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el].reopenedIssueCountPerIssueCountRatio = reopenedIssueCountPerIssueCountRatio;

      const reopenedIssueCountPerTestedIssueCountRatio = Number((reopenedIssuesCount
          / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el]
        .reopenedIssueCountPerTestedIssueCountRatio = reopenedIssueCountPerTestedIssueCountRatio;

      const reopenedIssueCountPerTestedIssueWithBugsCountRatio = Number((reopenedIssuesCount
          / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el] // eslint-disable-next-line max-len
        .reopenedIssueCountPerTestedIssueWithBugsCountRatio = reopenedIssueCountPerTestedIssueWithBugsCountRatio;

      // calculate and fill bugs count for each entity
      testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
        if (testedIssueWithBugs[key] === el) bugsCount += testedIssueWithBugs.bugsCount;
      });

      accumulator[el].bugsCount = bugsCount;

      // calculate and fill reopens count for each entity
      reopenedIssuesWithCommentsArr.forEach((reopenedIssueWithComments) => {
        if (reopenedIssueWithComments[key] === el) {
          reopensCount += reopenedIssueWithComments.reopensCount;
        }
      });

      accumulator[el].reopensCount = reopensCount;

      // calculate and fill bugs ratios for each entity
      const bugsCountPerTestedIssueCountRatio = Number((bugsCount
          / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el].bugsCountPerTestedIssueCountRatio = bugsCountPerTestedIssueCountRatio;

      const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
          / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el]
        .bugsCountPerTestedIssueWithBugsCountRatio = bugsCountPerTestedIssueWithBugsCountRatio;

      const bugsCountPerOverallBugsCountRatio = Number((bugsCount
            / overallBugsCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el].bugsCountPerOverallBugsCountRatio = bugsCountPerOverallBugsCountRatio;

      // calculate and fill reopens ratios for each entity
      const reopensCountPerReopenedIssueCountRatio = Number((reopensCount
          / reopenedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el]
        .reopensCountPerReopenedIssueCountRatio = reopensCountPerReopenedIssueCountRatio;

      const reopensCountPerOverallReopensCountRatio = Number((reopensCount
            / overallReopensCount).toFixed(JSONLoader.config.decimalPlaces));
      accumulator[el]
        .reopensCountPerOverallReopensCountRatio = reopensCountPerOverallReopensCountRatio;
    });
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
  ) {
    assigneeNames.forEach((el) => {
      // define fillable properties for each assignee in general scope
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
        // define fillable properties for each assignee in each project scope
        let bugsCount = 0;
        let issuesCount = 0;
        let affBugsCount = 0;
        let testedIssuesCount = 0;
        let testedIssuesWithBugsCount = 0;

        // allocate bugs to reporters or developers
        ({ bugsCount, affBugsCount } = this.setBugsToAssignees(
          testedIssuesWithBugsArr,
          el,
          projectName,
          affBugsCount,
          bugsCount,
          options.withDevAssignees,
        ));

        // set issues for each assignee if he was the assignee
        issuesWithAssigneesArr.forEach((issueWithAssignees) => {
          if (issueWithAssignees.projectName === projectName) {
            issueWithAssignees.assignees.forEach((assignee) => {
              if (assignee === el) issuesCount += 1;
            });
          }
        });

        // set tested issues for each assignee if he was the assignee
        testedIssuesWithAssigneesArr.forEach((testedIssueWithAssignees) => {
          if (testedIssueWithAssignees.projectName === projectName) {
            testedIssueWithAssignees.assignees.forEach((assignee) => {
              if (assignee === el) {
                testedIssuesCount += 1;
              }
            });
          }
        });

        // set tested issues with bugs for each assignee if he was the assignee
        testedIssuesWithBugsAndAssigneesArr.forEach((testedIssueWithBugsAndAssignees) => {
          if (testedIssueWithBugsAndAssignees.projectName === projectName) {
            testedIssueWithBugsAndAssignees.assignees.forEach((assignee) => {
              if (assignee === el) {
                testedIssuesWithBugsCount += 1;
              }
            });
          }
        });

        // define fillable entity for each project if exists something to fill
        projectBugCounts[projectName] = {};

        // fill issues count for each assignee in each project scope
        projectBugCounts[projectName].issuesCount = issuesCount;
        allIssuesCount += issuesCount;

        projectBugCounts[projectName].testedIssuesCount = testedIssuesCount;
        allTestedIssuesCount += testedIssuesCount;

        projectBugCounts[projectName].testedIssuesWithBugsCount = testedIssuesWithBugsCount;
        allTestedIssuesWithBugsCount += testedIssuesWithBugsCount;

        // calculate and fill issues ratio for each assignee in each project scope
        const testedIssuesCountPerIssueCountRatio = Number((testedIssuesCount
              / issuesCount).toFixed(JSONLoader.config.decimalPlaces));
        projectBugCounts[projectName]
          .testedIssuesCountPerIssueCountRatio = testedIssuesCountPerIssueCountRatio;

        const testedIssuesWithBugsCountPerTestedIssueCountRatio = Number((testedIssuesWithBugsCount
          / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
        projectBugCounts[projectName] // eslint-disable-next-line max-len
          .testedIssuesWithBugsCountPerTestedIssueCountRatio = testedIssuesWithBugsCountPerTestedIssueCountRatio;

        // fill bugs count for each assignee in each project scope
        projectBugCounts[projectName].bugsCount = bugsCount;
        allBugsCount += bugsCount;

        projectBugCounts[projectName].affBugsCount = affBugsCount;
        allAffBugsCount += affBugsCount;

        // calculate and fill bugs ratios for each assignee in each project scope
        const bugsCountPerTestedIssueCountRatio = Number((bugsCount
              / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
        projectBugCounts[projectName]
          .bugsCountPerTestedIssueCountRatio = bugsCountPerTestedIssueCountRatio;
        bugsCountPerTestedIssueCountRatios.push(bugsCountPerTestedIssueCountRatio);

        const affBugsCountPerTestedIssueCountRatio = Number((affBugsCount
              / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
        projectBugCounts[projectName]
          .affBugsCountPerTestedIssueCountRatio = affBugsCountPerTestedIssueCountRatio;
        affBugsCountPerTestedIssueCountRatios.push(affBugsCountPerTestedIssueCountRatio);

        const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
              / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
        projectBugCounts[projectName]
          .bugsCountPerTestedIssueWithBugsCountRatio = bugsCountPerTestedIssueWithBugsCountRatio;
        bugsCountPerTestedIssueWithBugsCountRatios
          .push(bugsCountPerTestedIssueWithBugsCountRatio);

        const affBgsCntPerTestedIssueWithBugsCntRatio = Number((affBugsCount
              / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
        projectBugCounts[projectName]
          .affBugsCountPerTestedIssueWithBugsCountRatio = affBgsCntPerTestedIssueWithBugsCntRatio;
        affBugsCountPerTestedIssueWithBugsCountRatios
          .push(affBgsCntPerTestedIssueWithBugsCntRatio);

        const bugsCountPerOverallBugsCountRatio = Number((bugsCount
              / overallBugsCount).toFixed(JSONLoader.config.decimalPlaces));
        projectBugCounts[projectName]
          .bugsCountPerOverallBugsCountRatio = bugsCountPerOverallBugsCountRatio;
        allBugsCountPerOverallBugsCountRatio += bugsCountPerOverallBugsCountRatio;

        const affBugsCountPerOverallBugsCountRatio = Number((affBugsCount
              / overallBugsCount).toFixed(JSONLoader.config.decimalPlaces));
        projectBugCounts[projectName]
          .affBugsCountPerOverallBugsCountRatio = affBugsCountPerOverallBugsCountRatio;
        allAffBugsCountPerOverallBugsCountRatio += affBugsCountPerOverallBugsCountRatio;
      });

      // fill projects data for each assignee
      accumulator[el] = {
        projects: projectBugCounts,
      };

      // fill overall issues count for each assignee
      accumulator[el].allIssuesCount = allIssuesCount;

      accumulator[el].allTestedIssuesCount = allTestedIssuesCount;

      accumulator[el].allTestedIssuesWithBugsCount = allTestedIssuesWithBugsCount;

      // calculate and fill overall issues ratio for each assignee
      accumulator[el].allTestedIssuesCountPerAllIssueCountRatio = Number((allTestedIssuesCount
            / allIssuesCount).toFixed(JSONLoader.config.decimalPlaces));

      // fill overall bugs count for each assignee
      accumulator[el].allBugsCount = allBugsCount;

      accumulator[el].allAffBugsCount = allAffBugsCount;

      // calculate and fill overall bugs ratios for each assignee
      accumulator[el]
        .allBugsCountPerOverallBugsCountRatio = Number(allBugsCountPerOverallBugsCountRatio
          .toFixed(JSONLoader.config.decimalPlaces));

      accumulator[el].allAffBugsCountPerOverallBugsCountRatio = Number(
        allAffBugsCountPerOverallBugsCountRatio
          .toFixed(JSONLoader.config.decimalPlaces),
      );

      accumulator[el].allBugsCountPerAllTestedIssueCountRatio = Number((allBugsCount
            / allTestedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));

      accumulator[el].allAffBugsCountPerAllTestedIssueCountRatio = Number((allAffBugsCount
            / allTestedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));

      accumulator[el].allBugsCountPerAllTestedIssueWithBugsCountRatio = Number((allBugsCount
            / allTestedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));

      accumulator[el].allAffBugsCountPerAllTestedIssueWithBugsCountRatio = Number((allAffBugsCount
            / allTestedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));

      accumulator[el].bugsCountPerTestedIssueCountAverageRatio = DataUtils
        .averageRatio(bugsCountPerTestedIssueCountRatios);

      accumulator[el].affBugsCountPerTestedIssueCountAverageRatio = DataUtils
        .averageRatio(affBugsCountPerTestedIssueCountRatios);

      accumulator[el].bugsCountPerTestedIssueWithBugsCountAverageRatio = DataUtils
        .averageRatio(bugsCountPerTestedIssueWithBugsCountRatios);

      accumulator[el].affBugsCountPerTestedIssueWithBugsCountAverageRatio = DataUtils
        .averageRatio(affBugsCountPerTestedIssueWithBugsCountRatios);
    });
  }

  static fillEntitiesPerProjects(
    projects,
    issuesWithCommentsArr,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    reopenedIssuesWithCommentsArr,
    key,
    entityNames,
    overallBugsCount,
    overallReopensCount,
  ) {
    for (const project in projects) {
      if (Object.hasOwn(projects, project)) {
        const entitiesInProject = {};

        // get issues for each project
        const filteredIssuesWithCommentsArr = issuesWithCommentsArr
          .filter((issueWithComments) => issueWithComments.projectName === project);

        const filteredTestedIssuesWithCommentsArr = testedIssuesWithCommentsArr
          .filter((testedIssueWithComments) => testedIssueWithComments.projectName === project);

        const filteredTestedIssuesWithBugsArr = testedIssuesWithBugsArr
          .filter((testedIssueWithBugs) => testedIssueWithBugs.projectName === project);

        const filteredReopenedIssuesWithCommentsArr = reopenedIssuesWithCommentsArr
          .filter((reopenedIssueWithComments) => reopenedIssueWithComments.projectName === project);

        // get or calculate issues and bugs count and ratio for each entity in each project
        this.fillBugsAndIssuesPerEntities(
          entitiesInProject,
          filteredIssuesWithCommentsArr,
          filteredTestedIssuesWithCommentsArr,
          filteredTestedIssuesWithBugsArr,
          filteredReopenedIssuesWithCommentsArr,
          key,
          entityNames,
          overallBugsCount,
          overallReopensCount,
        );

        // fill issues and bugs count and ratio for each entity in each project
        projects[project][key] = entitiesInProject;
      }
    }
  }

  static setBugsToAssignees(
    testedIssuesWithBugsArr,
    assignee,
    projectName,
    affBugsCount,
    bugsCount,
    withDevAssignees,
  ) {
    // get comments with bugs for each issue in each project
    testedIssuesWithBugsArr
      .filter((testedIssueWithBugs) => testedIssueWithBugs.projectName === projectName)
      .forEach((testedIssueWithBugs) => {
        const { commentsWithBugsLinkedToDevelopers } = testedIssueWithBugs;

        commentsWithBugsLinkedToDevelopers.forEach((commentWithBugsLinkedToDeveloper) => {
        // set bug for reporter if he is comment author
          if (commentWithBugsLinkedToDeveloper.commentAuthor === assignee) bugsCount += 1;

          if (withDevAssignees) {
            const devAssignees = commentWithBugsLinkedToDeveloper.devAssignees ?? [];

            // set affiliated bug for each developer if he has transition from
            if (devAssignees.length > 1) {
              devAssignees.forEach((devAssignee) => {
                if (devAssignee.transitionFromAssignee === assignee) affBugsCount += 1;
              });

              // set bug for single developer if he has transition from
            } else if (devAssignees.length === 1) {
              if (devAssignees[0].transitionFromAssignee === assignee) bugsCount += 1;

              // set unassigned bug if developer not exists
            } else if (JSONLoader.config.issueWithoutAssignee === assignee) bugsCount += 1;
          }
        });
      });

    return { bugsCount, affBugsCount };
  }
}

export default DataFiller;
