/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import path from 'path';
import dotenv from 'dotenv';
import confluenceAPI from './modules/API/confluenceAPI.js';
import DataUtils from './modules/main/utils/data/dataUtils.js';

dotenv.config({ override: true });

const filesNames = [
  'Общее количество задач и багов c 26.03.2025 по 12.06.2025.png',
  'Общее соотношение количества багов и количества задач c 26.03.2025 по 12.06.2025.png',
];

const generateFilePaths = (filesNames) => filesNames
  .map((fileName) => `images/${fileName}`);

const generateFileBuffers = (filePaths) => filePaths
  .map((filePath) => DataUtils.getFile(path.resolve(filePath)));

const publishDiagrams = async () => {
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
    const response = await confluenceAPI.getAttachments(pageID);

    const attachmentsIDs = filesNames.map((fileName) => response.data.results
      .filter((element) => element.title === fileName).pop().id);
      
    for (const attachmentID of attachmentsIDs) {
      await confluenceAPI.deleteAttachment(attachmentID);
      await confluenceAPI.deleteAttachment(attachmentID, { purge: true });
    }
  } else {
    const response = await confluenceAPI.createPage(subfolderID, pageName);
    pageID = response.data.id;
  }

  const filePaths = generateFilePaths(filesNames);
  const fileBuffers = generateFileBuffers(filePaths);

  const fileObjArr = filesNames.map((fileName, index) => {
    const fileObj = {};
    fileObj.file = fileName;
    fileObj.fileBuffer = fileBuffers[index];

    return fileObj;
  });

  await confluenceAPI.createAttachments(pageID, fileObjArr, 'image/png');

  response = await confluenceAPI.getVersion(pageID);
  const version = response.data.version.number;

  await confluenceAPI.updatePage(pageID, subfolderID, pageName, version, filesNames);
};

publishDiagrams();
