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

  async search() {
    return this.get(JSONLoader.APIEndpoints.jira.search);
  }

  async getIssueComments(id) {
    return this.get(`${JSONLoader.APIEndpoints.jira.issue}/${id}/comment`);
  }
}

export default new JiraAPI();
