import JSONLoader from './JSONLoader.js';
import TimeUtils from '../time/timeUtils.js';
import jiraAPI from '../../../API/jiraAPI.js';

class PaginationAggregator {
  static async getAllIssues(dateBegin, dateEnd) {
    let isLast;
    let nextPageToken;
    const issues = [];
    const maxResults = JSONLoader.config.issuesAndChangelogPaginationPageLimit;

    while (!isLast) {
      const params = {
        maxResults,
        nextPageToken,
        fields: '*all',
        expand: 'changelog',
        jql: `status changed FROM "${JSONLoader
          .config.backlogStatus}" AFTER ${TimeUtils
          .subtractDay(dateBegin)} AND status changed FROM "${JSONLoader
          .config.backlogStatus}" BEFORE ${TimeUtils
          .addDay(dateEnd)} ORDER BY created ASC`,
      };

      let response;
      do { // eslint-disable-next-line no-await-in-loop
        response = await jiraAPI.searchJQL(params);
      } while (response.status !== 200);

      issues.push(...response.data.issues);
      isLast = response.data.isLast;
      nextPageToken = response.data.nextPageToken;
    }

    return issues;
  }

  static async getAllChangelogItems(id) {
    let total;
    let startAt = 0;
    const histories = [];
    const maxResults = JSONLoader.config.issuesAndChangelogPaginationPageLimit;

    while (!total || startAt < total) {
      const params = {
        startAt,
        maxResults,
      };

      let response;
      do { // eslint-disable-next-line no-await-in-loop
        response = await jiraAPI.getIssueChangelog(id, params);
      } while (response.status !== 200);

      histories.push(...response.data.values);
      total = response.data.total;
      startAt += maxResults;
    }

    return histories;
  }

  static async getAllGroupMembers(groupId) {
    let isLast;
    let startAt = 0;
    const members = [];
    const maxResults = JSONLoader.config.membersPaginationPageLimit;

    while (!isLast) {
      const params = {
        startAt,
        groupId,
        maxResults,
      };

      let response;
      do { // eslint-disable-next-line no-await-in-loop
        response = await jiraAPI.groupMember(params);
      } while (response.status !== 200);

      members.push(...response.data.values);
      isLast = response.data.isLast;
      startAt += maxResults;
    }

    return members;
  }

  static async getAllGroups() {
    let isLast;
    let startAt = 0;
    const groups = [];
    const maxResults = JSONLoader.config.issuesAndChangelogPaginationPageLimit;

    while (!isLast) {
      const params = {
        startAt,
        maxResults,
      };

      let response;
      do { // eslint-disable-next-line no-await-in-loop
        response = await jiraAPI.groupBulk(params);
      } while (response.status !== 200);

      groups.push(...response.data.values);
      isLast = response.data.isLast;
      startAt += maxResults;
    }

    return groups;
  }
}

export default PaginationAggregator;
