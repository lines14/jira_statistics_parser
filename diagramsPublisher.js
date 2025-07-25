/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import path from 'path';
import dotenv from 'dotenv';
import confluenceAPI from './modules/API/confluenceAPI.js';
import DataUtils from './modules/main/utils/data/dataUtils.js';
import { getFiles } from './modules/main/utils/data/filesParser.js';

dotenv.config({ override: true });

const fileExtension = '.png';
const dirSubPath = './images';
const dirPath = path.relative(path.resolve(), dirSubPath);

const getFileNames = (dirObj) => dirObj.fileObjects
  .map((fileObj) => fileObj.file.split('/').pop());

const getFilePaths = (dirObj) => dirObj.fileObjects
  .map((fileObj) => `${dirObj.dirPath}/${fileObj.file}`);

const getFileBuffers = (filePaths) => filePaths
  .map((filePath) => DataUtils.getFile(path.resolve(filePath)));

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
}

const publishDiagrams = async () => {
  const dirObj = getFiles(dirPath, fileExtension);
  const filePaths = getFilePaths(dirObj);
  const filesNames = getFileNames(dirObj);
  const fileBuffers = getFileBuffers(filePaths);

  const fileObjArr = filesNames.map((fileName, index) => {
    const fileObj = {};
    fileObj.file = fileName;
    fileObj.fileBuffer = fileBuffers[index];

    return fileObj;
  });

  const month = 'июль';
  const folderName = '2026';
  const pageName = `${month} ${folderName}`;

  const folderID = process.env.CONFLUENCE_FOLDER_ID;
  let response = await confluenceAPI.getSubFolders(folderID);

  let result = response.data.results
    .filter((result) => result.title === folderName);

  let subfolderID;
  if (result.length) {
    subfolderID = result.pop().id;
  } else {
    const response = await confluenceAPI.createPage(folderID, folderName, { isFolder: true });
    subfolderID = response.data.id;
  }

  response = await confluenceAPI.getPages(subfolderID);

  result = response.data.results
    .filter((result) => result.title === pageName);

  let pageID;
  if (result.length) {
    pageID = result.pop().id;
    const response = await confluenceAPI.getAttachments(pageID, fileObjArr.length);

    const attachmentsIDs = filesNames.map((fileName) => response.data.results
      .filter((element) => element.title === fileName).pop().id);

    await deleteAttachmentsWithRetries(attachmentsIDs);
  } else {
    const response = await confluenceAPI.createPage(subfolderID, pageName);
    pageID = response.data.id;
  }

  const chunks = DataUtils.splitArrIntoChunks(fileObjArr);

  for (const chunk of chunks) {
    await confluenceAPI.createAttachments(pageID, chunk, 'image/png');
  }

  response = await confluenceAPI.getVersion(pageID);
  const version = response.data.version.number;

  await confluenceAPI.updatePage(pageID, subfolderID, pageName, version, filesNames);
};

publishDiagrams();
