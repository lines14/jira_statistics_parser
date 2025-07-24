/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import path from 'path';
import dotenv from 'dotenv';
import confluenceAPI from './modules/API/confluenceAPI.js';
import DataUtils from './modules/main/utils/data/dataUtils.js';

dotenv.config({ override: true });

const firstFile = 'Общее количество задач и багов c 01.07.2025 по 01.08.2025.png';
const secondFile = 'Общее соотношение количества багов и количества задач c 26.03.2025 по 24.07.2025.png';
const firstFilePath = `images/${firstFile}`;
const secondFilePath = `images/${secondFile}`;
const fisrtFileBuffer = DataUtils.getFile(path.resolve(firstFilePath));
const secondFileBuffer = DataUtils.getFile(path.resolve(secondFilePath));

const publishDiagrams = async () => {
  const folderID = process.env.CONFLUENCE_FOLDER_ID;
  let response = await confluenceAPI.getFolders(folderID);

  const subfolderID = response.data.results
    .filter((result) => result.title === '2025').pop().id;
  response = await confluenceAPI.postPage(subfolderID);

  const pageID = response.data.id;

  const firstFileObj = {};
  firstFileObj.file = firstFile;
  firstFileObj.fileBuffer = fisrtFileBuffer;
  await confluenceAPI.postAttachment(pageID, firstFileObj, 'image/png');

  const secondFileObj = {};
  secondFileObj.file = secondFile;
  secondFileObj.fileBuffer = secondFileBuffer;
  await confluenceAPI.postAttachment(pageID, secondFileObj, 'image/png');

  response = await confluenceAPI.getVersion(pageID);

  const version = response.data.version.number;
  await confluenceAPI.putPage(pageID, subfolderID, version, { fileNames: [firstFile, secondFile] });
};

publishDiagrams();
