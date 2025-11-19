import dotenv from 'dotenv';
import BaseAPI from '../main/utils/API/baseAPI.js';
import TimeUtils from '../main/utils/time/timeUtils.js';
import JSONLoader from '../main/utils/data/JSONLoader.js';

dotenv.config({ override: true });

class JiraAPI extends BaseAPI {
  constructor(options = {
    baseURL: process.env.JIRA_URL,
    logString: '[inf] ▶ set base API URL:',
    headers: {
      Authorization: `Basic ${btoa(`${process.env.JIRA_LOGIN}:${process.env.JIRA_TOKEN}`)}`,
    },
  }) {
    super(options);
  }

  async searchAll(dateBegin, dateEnd) {
    let isLast;
    let nextPageToken;
    const issues = [];
    const maxResults = 100;

    while (!isLast) {
      const params = {
        maxResults,
        nextPageToken,
        fields: '*all',
        expand: 'changelog',
        jql: `status changed FROM "${JSONLoader.config.backlogStatus}" AFTER ${TimeUtils.subtractDay(dateBegin)} AND status changed FROM "${JSONLoader.config.backlogStatus}" BEFORE ${TimeUtils.addDay(dateEnd)} ORDER BY created ASC`,
      };

      // eslint-disable-next-line no-await-in-loop
      const response = await this.get(JSONLoader.APIEndpoints.jira.searchJQL, params);
      issues.push(...response.data.issues);
      isLast = response.data.isLast;
      nextPageToken = response.data.nextPageToken;
    }

    return issues;
  }

  async getIssueComments(id) {
    return this.get(`${JSONLoader.APIEndpoints.jira.issue}/${id}/comment`);
  }

  async getFullIssueChangelog(id) {
    let total;
    let startAt = 0;
    const maxResults = 100;
    const histories = [];

    while (!total || startAt < total) {
      const params = {
        startAt,
        maxResults,
      };

      // eslint-disable-next-line no-await-in-loop
      const response = await this.get(`${JSONLoader.APIEndpoints.jira.issue}/${id}/changelog`, params);
      total = response.data.total;
      histories.push(...response.data.values);
      startAt += maxResults;
    }

    return histories;
  }

  async groupMember(groupname) {
    const params = {
      groupname,
    };

    return this.get(JSONLoader.APIEndpoints.jira.groupMember, params);
  }

  async usersSearch() {
    const params = {
      maxResults: 2000,
      startAt: 0,
    };

    return this.get(JSONLoader.APIEndpoints.jira.usersSearch, params);
  }
}

export default new JiraAPI();
