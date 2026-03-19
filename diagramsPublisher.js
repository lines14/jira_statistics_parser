/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import path from 'path';
import dotenv from 'dotenv';
import confluenceAPI from './modules/API/confluenceAPI.js';
import TimeUtils from './modules/main/utils/time/timeUtils.js';
import getFiles from './modules/main/utils/data/filesParser.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';
import FileDataUtils from './modules/main/utils/data/fileDataUtils.js';
import ConfluenceUtils from './modules/main/utils/data/confluenceUtils.js';

dotenv.config({ override: true });

const dirSubPath = 'images';
const imagesFileExtension = '.png';
const summaryFileExtension = '.json';
const dirPath = path.relative(path.resolve(), dirSubPath);

const publishDiagrams = async () => { // get all data for upload
  const months = TimeUtils.getMonths();
  const dirObj = getFiles(dirPath, imagesFileExtension);
  const filePaths = FileDataUtils.getFilePaths(dirObj);
  const filesNames = FileDataUtils.getFileNames(dirObj);
  const fileBuffers = FileDataUtils.getFileBuffers(filePaths);
  const fileNameGroups = FileDataUtils.getFileNameGroups(filePaths);

  const filteredSubPaths = dirObj.subPaths.filter((subPath) => months
    .some((month) => subPath.includes(month)));

  const yearAndMonth = filteredSubPaths.shift().split(dirSubPath).pop().split('/');
  const month = yearAndMonth.pop();
  const folderName = yearAndMonth.pop();
  const pageName = `${month} ${folderName}`;

  // prepare diagrams upload queue to Confluence
  const fileObjArr = filesNames.map((fileName, index) => {
    const fileObj = {};
    fileObj.file = fileName;
    fileObj.fileBuffer = fileBuffers[index];

    return fileObj;
  });

  // add summary file to filenames list
  const { cyrillicSummary } = JSONLoader;
  const fileName = `${Object.keys({ cyrillicSummary }).pop()}${summaryFileExtension}`;
  filesNames.unshift(fileName);
  fileNameGroups.root.unshift(fileName);

  fileObjArr.push({ // add summary file to upload queue to Confluence
    file: fileName,
    fileBuffer: JSON.stringify(cyrillicSummary, null, JSONLoader.config.decimalPlaces),
  });

  // get nested "year" folder from Confluence to receive it`s ID
  const folderID = process.env.CONFLUENCE_FOLDER_ID;
  let response = await confluenceAPI.getSubFolders(folderID);

  let result = response.data.results
    .filter((res) => res.title === folderName);

  let subfolderID;
  if (result.length) {
    subfolderID = result.pop().id;
  } else { // create nested "year" folder in Confluence if not exists
    const resp = await confluenceAPI.createPage(folderID, folderName, { isFolder: true });
    subfolderID = resp.data.id;
  }

  // get nested "month" page from Confluence to receive it`s ID
  response = await confluenceAPI.getPages(subfolderID);

  result = response.data.results
    .filter((res) => res.title === pageName);

  let pageID;
  if (result.length) { // get existing attachments from page to cleanup before upload new ones
    pageID = result.pop().id;
    const resp = await confluenceAPI.getAttachments(pageID, fileObjArr.length);

    const attachmentsIDs = filesNames.map((nameOfFile) => resp.data.results
      .filter((element) => element.title === nameOfFile).pop().id);

    await ConfluenceUtils.deleteAttachmentsWithRetries(attachmentsIDs);
  } else { // create nested "month" page in Confluence if not exists
    const resp = await confluenceAPI.createPage(subfolderID, pageName);
    pageID = resp.data.id;
  }

  // divide array of attachments to equal parts for upload in case of Confluence limitations
  const chunks = FileDataUtils.splitArrIntoChunks(fileObjArr);

  for (const chunk of chunks) { // upload diagrams
    await confluenceAPI.createAttachments(pageID, chunk, 'image/png');
  }

  // get previous version of Confluence "month" page to increment it during markup update
  response = await confluenceAPI.getVersion(pageID);
  const version = response.data.version.number;

  // update markup on Confluence "month" page with uploaded attachments
  const markup = ConfluenceUtils.generateMarkup(fileNameGroups);
  await confluenceAPI.updatePage(pageID, subfolderID, pageName, version, markup);
};

publishDiagrams();
