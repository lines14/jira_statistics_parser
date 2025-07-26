/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import path from 'path';
import dotenv from 'dotenv';
import confluenceAPI from './modules/API/confluenceAPI.js';
import TimeUtils from './modules/main/utils/time/timeUtils.js';
import DataUtils from './modules/main/utils/data/dataUtils.js';
import getFiles from './modules/main/utils/data/filesParser.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';

dotenv.config({ override: true });

const dirSubPath = 'images';
const imagesFileExtension = '.png';
const summaryFileExtension = '.json';
const dirPath = path.relative(path.resolve(), dirSubPath);

const deleteAttachmentsWithRetries = async (attachmentsIDs, attempt = 1, maxAttempts = 3) => {
  const attachmentsIDsToRetry = [];
  for (const attachmentID of attachmentsIDs) {
    const firstResponse = await confluenceAPI.deleteAttachment(attachmentID);
    const secondResponse = await confluenceAPI.deleteAttachment(attachmentID, { purge: true });
    if (firstResponse.status === 429
      || secondResponse.status === 429) attachmentsIDsToRetry.push(attachmentID);
  }

  if (attachmentsIDsToRetry.length && attempt < maxAttempts) {
    await deleteAttachmentsWithRetries(attachmentsIDsToRetry, attempt + 1, maxAttempts);
  }
};

const publishDiagrams = async () => {
  const months = TimeUtils.getMonths();
  const dirObj = getFiles(dirPath, imagesFileExtension);
  const filePaths = DataUtils.getFilePaths(dirObj);
  const filesNames = DataUtils.getFileNames(dirObj);
  const fileBuffers = DataUtils.getFileBuffers(filePaths);
  const fileNameGroups = DataUtils.getFileNameGroups(filePaths);

  const filteredSubPaths = dirObj.subPaths.filter((subPath) => months
    .some((month) => subPath.includes(month)));

  const yearAndMonth = filteredSubPaths.shift().split(dirSubPath).pop().split('/');
  const month = yearAndMonth.pop();
  const folderName = yearAndMonth.pop();
  const pageName = `${month} ${folderName}`;

  const fileObjArr = filesNames.map((fileName, index) => {
    const fileObj = {};
    fileObj.file = fileName;
    fileObj.fileBuffer = fileBuffers[index];

    return fileObj;
  });

  const { cyrillicSummary } = JSONLoader;
  const fileName = `${Object.keys({ cyrillicSummary }).pop()}${summaryFileExtension}`;

  fileObjArr.push({
    file: fileName,
    fileBuffer: JSON.stringify(cyrillicSummary, null, JSONLoader.config.decimalPlaces),
  });

  filesNames.unshift(fileName);
  fileNameGroups.root.unshift(fileName);
  const markup = DataUtils.generateMarkup(fileNameGroups);

  const folderID = process.env.CONFLUENCE_FOLDER_ID;
  let response = await confluenceAPI.getSubFolders(folderID);

  let result = response.data.results
    .filter((res) => res.title === folderName);

  let subfolderID;
  if (result.length) {
    subfolderID = result.pop().id;
  } else {
    const resp = await confluenceAPI.createPage(folderID, folderName, { isFolder: true });
    subfolderID = resp.data.id;
  }

  response = await confluenceAPI.getPages(subfolderID);

  result = response.data.results
    .filter((res) => res.title === pageName);

  let pageID;
  if (result.length) {
    pageID = result.pop().id;
    // '-------------------------------------------------------------------------';
    // const resp = await confluenceAPI.getAttachments(pageID, fileObjArr.length);

    // const attachmentsIDs = filesNames.map((fileName) => resp.data.results
    //   .filter((element) => element.title === fileName).pop().id);

    // await deleteAttachmentsWithRetries(attachmentsIDs);
    // '-------------------------------------------------------------------------';
  } else {
    const resp = await confluenceAPI.createPage(subfolderID, pageName);
    pageID = resp.data.id;
  }

  // '-----------------------------------------------------------------';
  // const chunks = DataUtils.splitArrIntoChunks(fileObjArr);

  // for (const chunk of chunks) {
  //   await confluenceAPI.createAttachments(pageID, chunk, 'image/png');
  // }
  // '-----------------------------------------------------------------';

  response = await confluenceAPI.getVersion(pageID);
  const version = response.data.version.number;

  await confluenceAPI.updatePage(pageID, subfolderID, pageName, version, markup);
};

publishDiagrams();
