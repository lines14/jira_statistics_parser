import dotenv from 'dotenv';
import BaseAPI from '../main/utils/API/baseAPI.js';
import JSONLoader from '../main/utils/data/JSONLoader.js';

dotenv.config({ override: true });

class ConfluenceAPI extends BaseAPI {
  #API;

  #options;

  constructor(options = {
    baseURL: process.env.CONFLUENCE_URL,
    logString: '[inf] ▶ set base API URL:',
    headers: {
      Authorization: `Basic ${btoa(`${process.env.CONFLUENCE_LOGIN}:${process.env.CONFLUENCE_TOKEN}`)}`,
    },
  }) {
    super(options);
    this.#options = options;
  }

  async getAttachments(pageID) {
    return this.get(`${JSONLoader.APIEndpoints.confluence.pages}/${pageID}/attachments`);
  }

  async deleteAttachment(attachmentID, options = { purge: false }) {
    const params = {
      purge: options.purge,
    };

    return this.delete(`${JSONLoader.APIEndpoints.confluence.attachments}/${attachmentID}`, params);
  }

  async postJSONAttachment(pageID, fileObj) {
    this.#options.headers['X-Atlassian-Token'] = 'nocheck';
    delete this.#options.logString;
    this.#API = new ConfluenceAPI(this.#options);
    const params = new FormData();
    params.append('content_type', 'multipart/form-data');
    params.append(
      'file',
      new Blob(
        [JSON.stringify(JSONLoader[fileObj.fileName], null, 4)],
        { type: 'application/json' },
      ),
      fileObj.file,
    );

    return this.#API.post(`${JSONLoader.APIEndpoints.confluence.content}/${pageID}/child/attachment`, params);
  }
}

export default new ConfluenceAPI();
