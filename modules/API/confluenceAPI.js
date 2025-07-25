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
      Authorization: `Basic ${btoa(`${process.env.JIRA_LOGIN}:${process.env.JIRA_TOKEN}`)}`,
    },
  }) {
    super(options);
    this.#options = options;
  }

  async getSubFolders(pageID) {
    return this.get(`${JSONLoader.APIEndpoints.confluence.content}/${pageID}/child/folder`);
  }

  async getPages(pageID) {
    return this.get(`${JSONLoader.APIEndpoints.confluence.content}/${pageID}/child/page`);
  }

  async getVersion(pageID) {
    const params = {
      expand: 'version',
    };

    return this.get(`${JSONLoader.APIEndpoints.confluence.content}/${pageID}`, params);
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

  async createAttachment(pageID, fileObj, type) {
    this.#options.headers['X-Atlassian-Token'] = 'nocheck';
    delete this.#options.logString;
    this.#API = new ConfluenceAPI(this.#options);

    const params = new FormData();
    params.append(
      'file',
      new Blob(
        [fileObj.fileBuffer],
        { type },
      ),
      fileObj.file,
    );

    return this.#API.post(`${JSONLoader.APIEndpoints.confluence.content}/${pageID}/child/attachment`, params);
  }

  async createPage(parentPageID, title, options = { isFolder: false }) {
    const params = {
      type: options.isFolder ? 'folder' : 'page',
      title,
      ancestors: [
        {
          id: parentPageID,
        },
      ],
      space: {
        key: 'DEV',
      },
      body: {
        storage: {
          representation: 'storage',
        },
      },
    };

    return this.post(JSONLoader.APIEndpoints.confluence.content, params);
  }

  async updatePage(pageID, parentPageID, title, version, fileNames) {
    const params = {
      version: {
        number: version + 1,
      },
      type: 'page',
      title,
      ancestors: [
        {
          id: parentPageID,
        },
      ],
      space: {
        key: 'DEV',
      },
      body: {
        storage: {
          value: `<h1>Тестовая страница</h1>\n<h2>Картинки</h2>\n<ac:image ac:height=\"auto\" ac:width=\"800\"><ri:attachment ri:filename=\"${fileNames[0]}\" /></ac:image>\n<h2>Еще картинки</h2>\n<ac:image ac:height=\"auto\" ac:width=\"800\"><ri:attachment ri:filename=\"${fileNames[1]}\" /></ac:image>`,
          representation: 'storage',
        },
      },
    };

    return this.put(`${JSONLoader.APIEndpoints.confluence.content}/${pageID}`, params);
  }
}

export default new ConfluenceAPI();
