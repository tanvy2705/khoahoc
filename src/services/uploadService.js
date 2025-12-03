const path = require('path');
const fs = require('fs');
const { deleteFile, getFileUrl } = require('../config/multer');

class UploadService {
  // Delete old file when uploading new one
  async replaceFile(oldFilePath, newFile) {
    if (oldFilePath) {
      deleteFile(oldFilePath);
    }
    return newFile.path;
  }

  // Delete multiple files
  async deleteFiles(filePaths) {
    const results = filePaths.map(filePath => deleteFile(filePath));
    return results;
  }

  // Get public URL for file
  getPublicUrl(filePath) {
    return getFileUrl(filePath);
  }

  // Validate file type
  isValidImageType(mimetype) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(mimetype);
  }

  // Get file size in MB
  getFileSizeInMB(sizeInBytes) {
    return (sizeInBytes / (1024 * 1024)).toFixed(2);
  }
}

module.exports = new UploadService();