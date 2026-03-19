import fs from 'fs';
import path from 'path';

class FileDataUtils {
  static getFile(filePath) {
    return fs.readFileSync(filePath);
  }

  static getFileNames(dirObj) {
    return dirObj.fileObjects.map((fileObj) => fileObj.file.split('/').pop());
  }

  static getFilePaths(dirObj) {
    return dirObj.fileObjects.map((fileObj) => `${dirObj.dirPath}/${fileObj.file}`);
  }

  static getFileBuffers(filePaths) {
    return filePaths.map((filePath) => this.getFile(path.resolve(filePath)));
  }

  static getFileNameGroups(filePaths) {
    return filePaths.map((filePath) => filePath.split('/').slice(3))
      .map((filePath) => ({
        name: filePath.pop(),
        group: filePath.length > 1 ? filePath.join('/') : filePath.pop() ?? 'root',
      })).reduce((acc, item) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item.name);
        return acc;
      }, {});
  }

  static splitArrIntoChunks(array, args = { partsCount: 8 }) {
    const result = [];
    const chunkSize = Math.ceil(array.length / args.partsCount);

    for (let i = 0; i < args.partsCount; i += 1) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      result.push(array.slice(start, end));
    }

    return result;
  }
}

export default FileDataUtils;
