import dotenv from 'dotenv';
import BaseAPI from '../main/utils/API/baseAPI.js';
import timeUtils from '../main/utils/time/timeUtils.js';
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

  async searchAll(fromDate) {
    let total;
    let startAt = 0;
    const maxResults = 100;
    const issues = [];
    const todayYMD = timeUtils
      .reformatDateFromDMYToYMD(timeUtils.reformatDateFromISOToDMY(timeUtils.today()));

    while (!total || startAt < total) {
      const params = {
        startAt,
        maxResults,
        expand: 'changelog',
        jql: `created >= ${fromDate} AND created <= ${todayYMD} ORDER BY created ASC`,
      };

      // eslint-disable-next-line no-await-in-loop
      const response = await this.get(JSONLoader.APIEndpoints.jira.search, params);
      total = response.data.total;
      issues.push(...response.data.issues);
      startAt += maxResults;
    }

    return issues;
  }

  async getIssueComments(id) {
    return this.get(`${JSONLoader.APIEndpoints.jira.issue}/${id}/comment`);
  }

  async groupMember(groupname) {
    const params = {
      groupname,
    };

    return this.get(JSONLoader.APIEndpoints.jira.groupMember, params);
  }
}

export default new JiraAPI();
