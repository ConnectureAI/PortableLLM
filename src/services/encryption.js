/**
 * Encryption Service
 * Provides HIPAA-compliant encryption for healthcare data
 * 
 * @module EncryptionService
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/app');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivation = 'pbkdf2';
    this.iterations = 100000;
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    this.masterKey = null;
    this.keyStore = new Map();
    
    this.init();
  }

  /**
   * Initialize encryption service
   */
  async init() {
    try {
      await this.loadOrCreateMasterKey();
      logger.info('Encryption service initialized');
    } catch (error) {
      logger.error('Failed to initialize encryption service:', error);
      throw error;
    }
  }

  /**
   * Load or create master encryption key
   */
  async loadOrCreateMasterKey() {
    const keyPath = path.join(config.paths.data, 'keys', 'master.key');
    const keyDir = path.dirname(keyPath);

    // Ensure key directory exists
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
    }

    try {
      if (fs.existsSync(keyPath)) {
        // Load existing master key
        const keyData = fs.readFileSync(keyPath);
        const parsed = JSON.parse(keyData.toString());
        
        // Verify key integrity
        if (!this.verifyKeyIntegrity(parsed)) {
          throw new Error('Master key integrity verification failed');
        }
        
        this.masterKey = parsed;
        logger.info('Master encryption key loaded');
      } else {
        // Create new master key
        this.masterKey = await this.generateMasterKey();
        
        // Save master key securely
        fs.writeFileSync(keyPath, JSON.stringify(this.masterKey), { mode: 0o600 });
        logger.info('New master encryption key created');
      }
      
      // Log key usage for compliance
      logger.auditLog('Encryption Key Access', {
        action: 'master_key_loaded',
        keyId: this.masterKey.id,
        algorithm: this.algorithm,
        compliance: 'HIPAA'
      });
      
    } catch (error) {
      logger.error('Failed to load/create master key:', error);
      throw error;
    }
  }

  /**
   * Generate new master key
   */
  async generateMasterKey() {
    const id = crypto.randomUUID();
    const key = crypto.randomBytes(this.keyLength);
    const salt = crypto.randomBytes(this.saltLength);
    const created = new Date().toISOString();
    
    // Create key verification hash
    const verification = crypto.createHash('sha256')
      .update(key)
      .update(salt)
      .update(id)
      .digest('hex');

    return {
      id,
      key: key.toString('base64'),
      salt: salt.toString('base64'),
      algorithm: this.algorithm,
      created,
      verification,
      version: '1.0'
    };
  }

  /**
   * Verify master key integrity
   */
  verifyKeyIntegrity(keyData) {
    try {
      const { id, key, salt, verification } = keyData;
      
      const computedVerification = crypto.createHash('sha256')
        .update(Buffer.from(key, 'base64'))
        .update(Buffer.from(salt, 'base64'))
        .update(id)
        .digest('hex');
      
      return verification === computedVerification;
    } catch (error) {
      logger.error('Key integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Derive encryption key from master key and context
   */
  deriveKey(context = 'default', userKey = null) {
    const cacheKey = `${context}:${userKey || 'system'}`;
    
    // Check cache first
    if (this.keyStore.has(cacheKey)) {
      return this.keyStore.get(cacheKey);
    }

    try {
      const masterKeyBuffer = Buffer.from(this.masterKey.key, 'base64');
      const saltBuffer = Buffer.from(this.masterKey.salt, 'base64');
      
      // Create context-specific salt
      const contextSalt = crypto.createHash('sha256')
        .update(saltBuffer)
        .update(context)
        .update(userKey || '')
        .digest();

      // Derive key using PBKDF2
      const derivedKey = crypto.pbkdf2Sync(
        masterKeyBuffer,
        contextSalt,
        this.iterations,
        this.keyLength,
        'sha256'
      );

      // Cache derived key
      this.keyStore.set(cacheKey, derivedKey);
      
      // Log key derivation for audit
      logger.auditLog('Key Derivation', {
        context,
        hasUserKey: !!userKey,
        algorithm: this.keyDerivation,
        iterations: this.iterations
      });

      return derivedKey;
    } catch (error) {
      logger.error('Key derivation failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt data
   */
  encrypt(data, context = 'default', userKey = null) {
    try {
      const key = this.deriveKey(context, userKey);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const tag = cipher.getAuthTag();
      
      const result = {
        data: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.algorithm,
        context,
        timestamp: new Date().toISOString()
      };

      // Log encryption for compliance
      logger.auditLog('Data Encryption', {
        context,
        dataLength: data.length,
        algorithm: this.algorithm,
        hasUserKey: !!userKey
      });

      return result;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData, context = 'default', userKey = null) {
    try {
      const { data, iv, tag, algorithm } = encryptedData;
      
      if (algorithm !== this.algorithm) {
        throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }

      const key = this.deriveKey(context, userKey);
      const ivBuffer = Buffer.from(iv, 'base64');
      const tagBuffer = Buffer.from(tag, 'base64');
      
      const decipher = crypto.createDecipher(algorithm, key, ivBuffer);
      decipher.setAuthTag(tagBuffer);
      
      let decrypted = decipher.update(data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Log decryption for compliance
      logger.auditLog('Data Decryption', {
        context,
        algorithm,
        hasUserKey: !!userKey,
        timestamp: encryptedData.timestamp
      });

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt file
   */
  async encryptFile(inputPath, outputPath, context = 'file', userKey = null) {
    try {
      const key = this.deriveKey(context, userKey);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      // Create streams
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);
      
      // Write metadata header
      const metadata = {
        algorithm: this.algorithm,
        iv: iv.toString('base64'),
        context,
        timestamp: new Date().toISOString(),
        originalSize: fs.statSync(inputPath).size
      };
      
      const metadataBuffer = Buffer.from(JSON.stringify(metadata));
      const metadataLengthBuffer = Buffer.alloc(4);
      metadataLengthBuffer.writeUInt32LE(metadataBuffer.length, 0);
      
      output.write(metadataLengthBuffer);
      output.write(metadataBuffer);

      // Encrypt file content
      return new Promise((resolve, reject) => {
        input.pipe(cipher).pipe(output);
        
        output.on('finish', () => {
          const tag = cipher.getAuthTag();
          
          // Append authentication tag
          fs.appendFileSync(outputPath, tag);
          
          logger.auditLog('File Encryption', {
            inputPath: path.basename(inputPath),
            outputPath: path.basename(outputPath),
            context,
            originalSize: metadata.originalSize
          });
          
          resolve();
        });
        
        output.on('error', reject);
        input.on('error', reject);
      });
      
    } catch (error) {
      logger.error('File encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt file
   */
  async decryptFile(inputPath, outputPath, context = 'file', userKey = null) {
    try {
      // Read metadata header
      const input = fs.readFileSync(inputPath);
      
      const metadataLength = input.readUInt32LE(0);
      const metadataBuffer = input.slice(4, 4 + metadataLength);
      const metadata = JSON.parse(metadataBuffer.toString());
      
      if (metadata.algorithm !== this.algorithm) {
        throw new Error(`Unsupported encryption algorithm: ${metadata.algorithm}`);
      }
      
      const key = this.deriveKey(context, userKey);
      const iv = Buffer.from(metadata.iv, 'base64');
      
      // Extract encrypted content and tag
      const encryptedContent = input.slice(4 + metadataLength, input.length - this.tagLength);
      const tag = input.slice(input.length - this.tagLength);
      
      // Decrypt
      const decipher = crypto.createDecipher(metadata.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
      ]);
      
      // Write decrypted file
      fs.writeFileSync(outputPath, decrypted);
      
      logger.auditLog('File Decryption', {
        inputPath: path.basename(inputPath),
        outputPath: path.basename(outputPath),
        context,
        decryptedSize: decrypted.length
      });
      
      return metadata;
      
    } catch (error) {
      logger.error('File decryption failed:', error);
      throw error;
    }
  }

  /**
   * Generate secure hash
   */
  hash(data, algorithm = 'sha256') {
    try {
      const hash = crypto.createHash(algorithm);
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Hashing failed:', error);
      throw error;
    }
  }

  /**
   * Generate HMAC
   */
  hmac(data, key = null, algorithm = 'sha256') {
    try {
      const hmacKey = key || this.deriveKey('hmac');
      const hmac = crypto.createHmac(algorithm, hmacKey);
      hmac.update(data);
      return hmac.digest('hex');
    } catch (error) {
      logger.error('HMAC generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate secure random token
   */
  generateToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('base64url');
    } catch (error) {
      logger.error('Token generation failed:', error);
      throw error;
    }
  }

  /**
   * Rotate master key
   */
  async rotateMasterKey() {
    try {
      logger.info('Starting master key rotation...');
      
      // Generate new master key
      const newMasterKey = await this.generateMasterKey();
      
      // Backup old key
      const backupPath = path.join(
        config.paths.data, 
        'keys', 
        `master.key.backup.${Date.now()}`
      );
      const keyPath = path.join(config.paths.data, 'keys', 'master.key');
      
      fs.copyFileSync(keyPath, backupPath);
      
      // Update master key
      const oldKeyId = this.masterKey.id;
      this.masterKey = newMasterKey;
      
      // Clear derived key cache
      this.keyStore.clear();
      
      // Save new key
      fs.writeFileSync(keyPath, JSON.stringify(newMasterKey), { mode: 0o600 });
      
      logger.auditLog('Master Key Rotation', {
        oldKeyId,
        newKeyId: newMasterKey.id,
        backupPath: path.basename(backupPath),
        timestamp: new Date().toISOString()
      });
      
      logger.info('Master key rotation completed successfully');
      
    } catch (error) {
      logger.error('Master key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Get encryption status
   */
  getStatus() {
    return {
      initialized: !!this.masterKey,
      algorithm: this.algorithm,
      keyDerivation: this.keyDerivation,
      masterKeyId: this.masterKey?.id,
      cachedKeys: this.keyStore.size,
      created: this.masterKey?.created,
      compliance: ['HIPAA', 'AES-256', 'PBKDF2']
    };
  }

  /**
   * Secure cleanup
   */
  cleanup() {
    try {
      // Clear sensitive data from memory
      if (this.masterKey) {
        // Overwrite key data
        if (this.masterKey.key) {
          const keyBuffer = Buffer.from(this.masterKey.key, 'base64');
          keyBuffer.fill(0);
        }
        this.masterKey = null;
      }
      
      // Clear derived keys
      this.keyStore.clear();
      
      logger.info('Encryption service cleaned up');
    } catch (error) {
      logger.error('Encryption cleanup failed:', error);
    }
  }
}

module.exports = EncryptionService;