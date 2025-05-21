import axios from 'axios';
import Logger from '../log/logger.js';

class BaseAPI {
  #baseURL;

  #logString;

  #timeout;

  #headers;

  #axiosInstance;

  constructor(options) {
    this.#baseURL = options.baseURL;
    this.#logString = options.logString;
    this.#timeout = options.timeout;
    this.#headers = options.headers;
    this.#axiosInstance = this.createInstance();
  }

  createInstance() {
    if (this.#logString) Logger.log(`${this.#logString} ${this.#baseURL}`);
    return axios.create({
      baseURL: this.#baseURL,
      timeout: this.#timeout,
      headers: this.#headers,
    });
  }

  async get(endpoint, params) {
    Logger.log(`[req] ▶ get ${JSON.stringify(params || {})} from ${endpoint}:`);
    try {
      const response = await this.#axiosInstance.get(`/${endpoint}`, { params });
      Logger.log(`[res]   status code: ${response.status}`);
      return response;
    } catch (error) {
      Logger.log(`[res]   status code: ${error.response.status}`);
      Logger.log(`[res]   body: ${JSON.stringify(error.response.data)}`);
      return error.response;
    }
  }

  async post(endpoint, params) {
    Logger.log(`[req] ▶ post ${JSON.stringify(params || {})} to ${endpoint}:`);
    try {
      const response = await this.#axiosInstance.post(`/${endpoint}`, params);
      Logger.log(`[res]   status code: ${response.status}`);
      return response;
    } catch (error) {
      Logger.log(`[res]   status code: ${error.response.status}`);
      Logger.log(`[res]   body: ${JSON.stringify(error.response.data)}`);
      return error.response;
    }
  }

  async patch(endpoint, params) {
    Logger.log(`[req] ▶ patch ${JSON.stringify(params || {})} to ${endpoint}:`);
    try {
      const response = await this.#axiosInstance.patch(`/${endpoint}`, params);
      Logger.log(`[res]   status code: ${response.status}`);
      return response;
    } catch (error) {
      Logger.log(`[res]   status code: ${error.response.status}`);
      Logger.log(`[res]   body: ${JSON.stringify(error.response.data)}`);
      return error.response;
    }
  }

  async put(endpoint, params) {
    try {
      Logger.log(`[req] ▶ put ${JSON.stringify(params || {})} to ${endpoint}:`);
      const response = await this.#axiosInstance.put(`/${endpoint}`, params);
      Logger.log(`[res]   status code: ${response.status}`);
      return response;
    } catch (error) {
      Logger.log(`[res]   status code: ${error.response.status}`);
      Logger.log(`[res]   body: ${JSON.stringify(error.response.data)}`);
      return error.response;
    }
  }

  async delete(endpoint, params) {
    try {
      Logger.log(`[req] ▶ delete ${JSON.stringify(params || {})} from ${endpoint}:`);
      const response = await this.#axiosInstance.delete(`/${endpoint}`, params);
      Logger.log(`[res]   status code: ${response.status}`);
      return response;
    } catch (error) {
      Logger.log(`[res]   status code: ${error.response.status}`);
      Logger.log(`[res]   body: ${JSON.stringify(error.response.data)}`);
      return error.response;
    }
  }
}

export default BaseAPI;
