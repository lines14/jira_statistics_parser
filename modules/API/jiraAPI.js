import dotenv from 'dotenv';
import BaseAPI from '../main/utils/API/baseAPI.js';
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

  async searchJQL(params) {
    return this.get(JSONLoader.APIEndpoints.jira.searchJQL, params);
  }

  async getIssueComments(id) {
    return this.get(`${JSONLoader.APIEndpoints.jira.issue}/${id}/comment`);
  }

  async getIssueChangelog(id, params) {
    return this.get(`${JSONLoader.APIEndpoints.jira.issue}/${id}/changelog`, params);
  }

  async usersSearch() {
    const params = {
      maxResults: JSONLoader.config.maxUsersCount,
      startAt: 0,
    };

    return this.get(JSONLoader.APIEndpoints.jira.usersSearch, params);
  }

  async groupMember(params) {
    return this.get(JSONLoader.APIEndpoints.jira.groupMember, params);
  }

  async groupBulk(params) {
    return this.get(JSONLoader.APIEndpoints.jira.groupBulk, params);
  }
}

export default new JiraAPI();
