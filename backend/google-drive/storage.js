const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);

class DriveStorage {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.connected = false;
    this.maxFileSize = 15 * 1024 * 1024 * 1024; // 15GB
    this.chunkSize = 5 * 1024 * 1024; // 5MB
    this.fileTypes = {
      'text/plain': '.txt',
      'application/pdf': '.pdf',
      'application/json': '.json',
      'text/csv': '.csv',
      'application/javascript': '.js',
      'text/html': '.html'
    };
    this.folders = {
      memories: 'asmf-memories',
      conversations: 'asmf-conversations', 
      training: 'asmf-training',
      backups: 'asmf-backups'
    };
  }

  async initialize() {
    try {
      console.log('☁️ Initializing Google Drive Storage...');
      
      // Load credentials
      const credentialsPath = path.join(__dirname, '..', 'config', 'credentials.json');
      const credentials = await this.loadCredentials(credentialsPath);
      
      // Initialize Google Auth
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
      });
      
      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      // Test connection
      await this.testConnection();
      
      // Ensure folders exist
      await this.ensureFolders();
      
      this.connected = true;
      console.log('✅ Google Drive Storage connected');
      
    } catch (error) {
      console.error('❌ Google Drive initialization failed:', error);
      throw new Error(`Google Drive initialization failed: ${error.message}`);
    }
  }

  async loadCredentials(credentialsPath) {
    try {
      const credentialsData = await fs.readFile(credentialsPath, 'utf-8');
      const credentials = JSON.parse(credentialsData);
      
      // Validate credentials structure
      if (!credentials.type || credentials.type !== 'service_account') {
        throw new Error('Invalid credentials file: must be a service account JSON');
      }
      
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Invalid credentials: missing client_email or private_key');
      }
      
      return credentials;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Credentials file not found: ${credentialsPath}. Please create it from Google Cloud Console.`);
      }
      throw new Error(`Failed to load credentials: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const response = await this.drive.about.get();
      console.log(`📊 Drive quota available: ${this.formatBytes(response.data.storageQuota.limit)}`);
      console.log(`💾 Drive usage: ${this.formatBytes(response.data.storageQuota.usage)}`);
    } catch (error) {
      throw new Error(`Drive connection test failed: ${error.message}`);
    }
  }

  async ensureFolders() {
    try {
      for (const [name, folderId] of Object.entries(this.folders)) {
        const folder = await this.findOrCreateFolder(name, null);
        this.folders[name] = folder.id;
        console.log(`📁 Folder "${name}" ready: ${folder.id}`);
      }
    } catch (error) {
      console.error('Folder creation failed:', error);
      throw error;
    }
  }

  async findOrCreateFolder(name, parentId = null) {
    try {
      // Search for existing folder
      const query = `name='${name}' and mimeType='application/vnd.google-apps.folder'`;
      const searchResponse = await this.drive.files.list({
        q: parentId ? `${query} and '${parentId}' in parents` : query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      
      if (searchResponse.data.files.length > 0) {
        return searchResponse.data.files[0];
      }
      
      // Create new folder
      const folderMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder'
      };
      
      if (parentId) {
        folderMetadata.parents = [parentId];
      }
      
      const createResponse = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id, name'
      });
      
      return createResponse.data;
    } catch (error) {
      throw new Error(`Failed to find or create folder "${name}": ${error.message}`);
    }
  }

  // File upload methods
  async saveFile(data, fileName, options = {}) {
    try {
      if (!this.connected) {
        throw new Error('Google Drive not connected');
      }

      const { 
        category = 'general',
        folder = 'memories',
        metadata = {},
        overwrite = true
      } = options;

      // Determine file size
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const fileSize = buffer.length;

      if (fileSize > this.maxFileSize) {
        throw new Error(`File too large: ${fileSize} bytes. Maximum allowed: ${this.maxFileSize} bytes`);
      }

      // Choose upload method based on size
      if (fileSize > this.chunkSize) {
        return await this.saveLargeFile(buffer, fileName, {
          category,
          folder,
          metadata,
          overwrite
        });
      } else {
        return await this.saveSmallFile(buffer, fileName, {
          category,
          folder,
          metadata,
          overwrite
        });
      }

    } catch (error) {
      console.error('File save failed:', error);
      throw error;
    }
  }

  async saveSmallFile(buffer, fileName, options) {
    try {
      const { category, folder, metadata, overwrite } = options;
      
      const fileMetadata = {
        name: `${Date.now()}_${fileName}`,
        parents: [this.folders[folder]],
        description: `ASMF ${category} file: ${fileName}`,
        properties: {
          asmf_file: 'true',
          category,
          originalName: fileName,
          uploaded_at: new Date().toISOString(),
          ...metadata
        }
      };

      const media = {
        mimeType: this.getMimeType(fileName),
        body: this.bufferToStream(buffer)
      };

      // Check if file exists and should be overwritten
      if (overwrite) {
        const existingFile = await this.findFile(fileName, this.folders[folder]);
        if (existingFile) {
          await this.drive.files.delete({ fileId: existingFile.id });
        }
      }

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name, size, webViewLink'
      });

      console.log(`✅ File uploaded: ${fileName} (${this.formatBytes(buffer.length)})`);
      
      return {
        id: response.data.id,
        name: response.data.name,
        size: buffer.length,
        webViewLink: response.data.webViewLink,
        category,
        folder
      };

    } catch (error) {
      throw new Error(`Small file upload failed: ${error.message}`);
    }
  }

  async saveLargeFile(buffer, fileName, options) {
    try {
      const { category, folder, metadata, overwrite } = options;
      
      // Start resumable upload session
      const session = await this.startResumableUpload(fileName, {
        category,
        folder,
        metadata,
        overwrite
      });

      // Upload file in chunks
      return await this.resumableUpload(buffer, session);

    } catch (error) {
      throw new Error(`Large file upload failed: ${error.message}`);
    }
  }

  async startResumableUpload(fileName, options) {
    const { category, folder, metadata, overwrite } = options;

    const fileMetadata = {
      name: `${Date.now()}_${fileName}`,
      parents: [this.folders[folder]],
      description: `ASMF ${category} file: ${fileName}`,
      properties: {
        asmf_file: 'true',
        category,
        originalName: fileName,
        uploaded_at: new Date().toISOString(),
        upload_type: 'resumable',
        ...metadata
      }
    };

    const media = {
      mimeType: this.getMimeType(fileName),
      body: this.bufferToStream(buffer)
    };

    const response = await this.drive.files.create({
      uploadType: 'resumable',
      resource: fileMetadata,
      media,
      fields: 'id, name, size, webViewLink'
    });

    return {
      fileId: response.data.id,
      uploadUrl: response.headers.location,
      name: response.data.name,
      size: buffer.length
    };
  }

  async resumableUpload(buffer, session) {
    try {
      const chunkSize = this.chunkSize;
      const totalSize = buffer.length;
      let uploadedBytes = 0;

      while (uploadedBytes < totalSize) {
        const end = Math.min(uploadedBytes + chunkSize, totalSize);
        const chunk = buffer.slice(uploadedBytes, end);
        
        const uploadHeaders = {
          'Content-Length': chunk.length.toString(),
          'Content-Range': `bytes ${uploadedBytes}-${end-1}/${totalSize}`
        };

        if (end === totalSize) {
          uploadHeaders['Content-Range'] = `bytes ${uploadedBytes}-${totalSize-1}/${totalSize}`;
        }

        try {
          const uploadResponse = await this.drive.files.update({
            fileId: session.fileId,
            media: {
              mimeType: this.getMimeType(session.name),
              body: this.bufferToStream(chunk)
            }
          }, {
            headers: uploadHeaders
          });

          uploadedBytes = end;
          console.log(`📤 Upload progress: ${this.formatBytes(uploadedBytes)}/${this.formatBytes(totalSize)}`);

        } catch (uploadError) {
          if (uploadError.code === 308) {
            // Resume from where we left off
            const range = uploadError.response.headers.range;
            if (range) {
              const match = range.match(/bytes=(\d+)-(\d+)/);
              if (match) {
                uploadedBytes = parseInt(match[2]) + 1;
              }
            }
            continue;
          } else {
            throw uploadError;
          }
        }
      }

      console.log(`✅ Large file uploaded: ${session.name} (${this.formatBytes(session.size)})`);
      
      return {
        id: session.fileId,
        name: session.name,
        size: session.size,
        category: 'general',
        uploadType: 'resumable'
      };

    } catch (error) {
      throw new Error(`Resumable upload failed: ${error.message}`);
    }
  }

  async findFile(fileName, folderId) {
    try {
      const query = `name contains '${fileName}' and '${folderId}' in parents`;
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc'
      });

      return response.data.files.length > 0 ? response.data.files[0] : null;
    } catch (error) {
      return null;
    }
  }

  // File retrieval methods
  async getFile(fileId, downloadOptions = {}) {
    try {
      if (!this.connected) {
        throw new Error('Google Drive not connected');
      }

      const { format = 'buffer', encoding = 'utf-8' } = downloadOptions;

      if (format === 'buffer') {
        const response = await this.drive.files.get({
          fileId,
          alt: 'media'
        }, {
          responseType: 'arraybuffer'
        });

        return Buffer.from(response.data);
      } else if (format === 'text') {
        const response = await this.drive.files.get({
          fileId,
          alt: 'media'
        }, {
          responseType: 'stream',
          encoding: null
        });

        const chunks = [];
        return new Promise((resolve, reject) => {
          response.data
            .on('data', chunk => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks).toString(encoding)))
            .on('error', reject);
        });
      }

    } catch (error) {
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  async listFiles(folder = 'memories', options = {}) {
    try {
      const { 
        pageSize = 50, 
        query = '', 
        orderBy = 'modifiedTime desc',
        fields = 'files(id, name, size, modifiedTime, description, properties)' 
      } = options;

      const searchQuery = `${query ? query + ' and ' : ''}'${this.folders[folder]}' in parents and trashed=false`;

      const response = await this.drive.files.list({
        q: searchQuery,
        pageSize,
        orderBy,
        fields,
        spaces: 'drive'
      });

      return response.data.files;
    } catch (error) {
      throw new Error(`File listing failed: ${error.message}`);
    }
  }

  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({ fileId });
      console.log(`🗑️ File deleted: ${fileId}`);
      return true;
    } catch (error) {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  // ASMF-specific methods
  async saveMemory(data, type = 'context') {
    const fileName = `${type}_${Date.now()}.json`;
    return await this.saveFile(JSON.stringify(data, null, 2), fileName, {
      category: type,
      folder: 'memories',
      metadata: {
        asmf_type: type,
        timestamp: new Date().toISOString()
      }
    });
  }

  async getMemories(type = null, limit = 100) {
    try {
      const query = type ? `properties.asmf_type = '${type}'` : 'properties.asmf_file = true';
      
      const files = await this.listFiles('memories', {
        query,
        pageSize: limit,
        orderBy: 'modifiedTime desc'
      });

      const memories = [];
      for (const file of files) {
        try {
          const data = await this.getFile(file.id, { format: 'text' });
          const parsed = JSON.parse(data);
          memories.push({
            id: file.id,
            type: file.properties.asmf_type,
            data: parsed,
            timestamp: file.modifiedTime,
            name: file.name
          });
        } catch (parseError) {
          console.warn(`Failed to parse memory file ${file.id}:`, parseError.message);
        }
      }

      return memories;
    } catch (error) {
      throw new Error(`Memory retrieval failed: ${error.message}`);
    }
  }

  async saveConversation(conversation) {
    const fileName = `conversation_${Date.now()}.json`;
    return await this.saveFile(JSON.stringify(conversation, null, 2), fileName, {
      category: 'conversation',
      folder: 'conversations',
      metadata: {
        asmf_type: 'conversation',
        session_id: conversation.sessionId,
        timestamp: new Date().toISOString()
      }
    });
  }

  async getConversations(sessionId = null, limit = 50) {
    try {
      let query = "properties.asmf_type = 'conversation'";
      if (sessionId) {
        query += ` and properties.session_id = '${sessionId}'`;
      }
      
      const files = await this.listFiles('conversations', {
        query,
        pageSize: limit,
        orderBy: 'modifiedTime desc'
      });

      const conversations = [];
      for (const file of files) {
        try {
          const data = await this.getFile(file.id, { format: 'text' });
          const parsed = JSON.parse(data);
          conversations.push({
            id: file.id,
            sessionId: file.properties.session_id,
            data: parsed,
            timestamp: file.modifiedTime,
            name: file.name
          });
        } catch (parseError) {
          console.warn(`Failed to parse conversation file ${file.id}:`, parseError.message);
        }
      }

      return conversations;
    } catch (error) {
      throw new Error(`Conversations retrieval failed: ${error.message}`);
    }
  }

  async backupMemoryState(stateData) {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        state: stateData
      };

      const fileName = `asmf_backup_${Date.now()}.json`;
      return await this.saveFile(JSON.stringify(backupData, null, 2), fileName, {
        category: 'backup',
        folder: 'backups',
        metadata: {
          asmf_type: 'backup',
          backup_type: 'memory_state'
        }
      });
    } catch (error) {
      console.error('Memory state backup failed:', error);
      throw error;
    }
  }

  async restoreMemoryState(backupId = null) {
    try {
      let query = "properties.asmf_type = 'backup' and properties.backup_type = 'memory_state'";
      if (backupId) {
        query += ` and id = '${backupId}'`;
      }
      
      const files = await this.listFiles('backups', {
        query,
        orderBy: 'modifiedTime desc',
        pageSize: 1
      });

      if (files.length === 0) {
        throw new Error('No backup files found');
      }

      const backupFile = files[0];
      const data = await this.getFile(backupFile.id, { format: 'text' });
      const backupData = JSON.parse(data);

      console.log(`📥 Memory state restored from backup: ${backupFile.name}`);
      return backupData.state;
    } catch (error) {
      throw new Error(`Memory state restoration failed: ${error.message}`);
    }
  }

  // Utility methods
  async getStorageInfo() {
    try {
      const response = await this.drive.about.get();
      const quota = response.data.storageQuota;
      
      return {
        total: parseInt(quota.limit),
        used: parseInt(quota.usage),
        available: parseInt(quota.limit) - parseInt(quota.usage),
        usagePercentage: (parseInt(quota.usage) / parseInt(quota.limit)) * 100
      };
    } catch (error) {
      throw new Error(`Storage info retrieval failed: ${error.message}`);
    }
  }

  async getSyncStatus() {
    try {
      const memories = await this.getMemories();
      const conversations = await this.getConversations();
      
      return {
        totalFiles: memories.length + conversations.length,
        memoryFiles: memories.length,
        conversationFiles: conversations.length,
        lastSync: new Date().toISOString(),
        status: 'synced'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastSync: null
      };
    }
  }

  // Helper methods
  bufferToStream(buffer) {
    const readable = new stream.Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    return readable;
  }

  getMimeType(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    return this.fileTypes[extension] || 'application/octet-stream';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isConnected() {
    return this.connected;
  }

  // Cleanup method
  async cleanup() {
    try {
      // Close any open connections
      this.auth = null;
      this.drive = null;
      this.connected = false;
      
      console.log('🧹 Google Drive connection closed');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

module.exports = { DriveStorage };
