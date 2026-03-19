/* eslint-disable no-await-in-loop */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import dotenv from 'dotenv';
import JSONLoader from './JSONLoader.js';
import confluenceAPI from '../../../API/confluenceAPI.js';

dotenv.config({ override: true });

class ConfluenceUtils {
  static zipFileNameGroups(fileNameGroups, groupKeys = []) {
    const groups = groupKeys.map((el) => fileNameGroups[el]);
    if (!groups.length) return [];

    return groups[0].map((_, i) => groups.map((row) => row[i])).flat();
  }

  static createMarkupExpandBlock(nestedMarkup) {
    return `<ac:structured-macro ac:name="expand">
          <ac:parameter ac:name="title">Раскрыть диаграммы</ac:parameter>
          <ac:rich-text-body>
            ${nestedMarkup}
          </ac:rich-text-body>
        </ac:structured-macro>`;
  }

  static createMarkupImage(fileName) {
    return `<ac:image ac:height="auto" ac:width="1000"><ri:attachment ri:filename="${fileName}" /></ac:image>\n`;
  }

  static createMarkupAttachmentTable(fileName) {
    return `<p>Файл с метриками, из которого генерировались диаграммы:</p>
        <div style="max-width: 1000px; overflow-x: auto;">
          <ac:structured-macro ac:name="attachments">
            <ac:parameter ac:name="patterns">${fileName}</ac:parameter>
            <ac:parameter ac:name="upload">false</ac:parameter>
            <ac:parameter ac:name="sortBy">date</ac:parameter>
          </ac:structured-macro>
        </div>`;
  }

  static generateMarkup(fileNameGroups) { // define diagrams sequence in Confluence markup
    const zippedSuperGroups = {};

    let markup = this.createMarkupAttachmentTable(fileNameGroups.root.shift());

    zippedSuperGroups.projectsWithTheirDevelopers = this.zipFileNameGroups(
      fileNameGroups,
      JSONLoader.config.markupSuperGroups.projectsWithTheirDevelopers,
    );

    zippedSuperGroups.projectsWithTheirQA = this.zipFileNameGroups(
      fileNameGroups,
      JSONLoader.config.markupSuperGroups.projectsWithTheirQA,
    );

    zippedSuperGroups.developersWithTheirProjects = this.zipFileNameGroups(
      fileNameGroups,
      JSONLoader.config.markupSuperGroups.developersWithTheirProjects,
    );

    zippedSuperGroups.QAWithTheirProjects = this.zipFileNameGroups(
      fileNameGroups,
      JSONLoader.config.markupSuperGroups.QAWithTheirProjects,
    );

    zippedSuperGroups.issueTypesInProjects = this.zipFileNameGroups(
      fileNameGroups,
      JSONLoader.config.markupSuperGroups.issueTypesInProjects,
    );

    // generate Confluence markup to upload
    for (const [superGroup, groups] of Object.entries(JSONLoader.config.markupSuperGroups)) {
      let nestedMarkup = '';

      markup += `<h1>${JSONLoader.config.markupSuperGroupCyrillicNames[superGroup]}</h1>\n`;

      if (superGroup in zippedSuperGroups) {
        for (const fileName of zippedSuperGroups[superGroup]) {
          nestedMarkup += this.createMarkupImage(fileName);
        }

        markup += this.createMarkupExpandBlock(nestedMarkup);
      } else {
        for (const group of groups) {
          for (const fileName of fileNameGroups[group]) {
            markup += this.createMarkupImage(fileName);
          }
        }
      }
    }

    return markup;
  }

  // cleanup attachments in Confluence
  static async deleteAttachmentsWithRetries(attachmentsIDs, attempt = 1, maxAttempts = 3) {
    const attachmentsIDsToRetry = [];
    for (const attachmentID of attachmentsIDs) {
      const firstResponse = await confluenceAPI.deleteAttachment(attachmentID);
      const secondResponse = await confluenceAPI.deleteAttachment(attachmentID, { purge: true });
      if (firstResponse.status === 429
        || secondResponse.status === 429) attachmentsIDsToRetry.push(attachmentID);
    }

    if (attachmentsIDsToRetry.length && attempt < maxAttempts) {
      await this.deleteAttachmentsWithRetries(attachmentsIDsToRetry, attempt + 1, maxAttempts);
    }
  }
}

export default ConfluenceUtils;
