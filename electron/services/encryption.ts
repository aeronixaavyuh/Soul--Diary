import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from 'crypto'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM    = 'aes-256-gcm'
const KEY_LENGTH   = 32   // 256 bits
const IV_LENGTH    = 16   // 128 bits
const TAG_LENGTH   = 16   // 128 bits
const SALT_LENGTH  = 32   // 256 bits
const SCRYPT_N     = 16384 // CPU/memory cost (lower = faster, less secure)
const SCRYPT_R     = 8
const SCRYPT_P     = 1

// Prefix to identify encrypted data
const ENC_PREFIX   = 'ENC:'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EncryptedPayload {
  salt: string   // hex
  iv:   string   // hex
  tag:  string   // hex
  data: string   // hex
}

// ─── EncryptionService ────────────────────────────────────────────────────────

class EncryptionService {
  private masterKey:    Buffer | null = null
  private isInitialized: boolean      = false
  private appSalt:      Buffer | null = null

  // ── Init ───────────────────────────────────────────────────────────────────

  /**
   * Initialize with a password (PIN or passphrase).
   * Must be called before any encrypt/decrypt operations.
   */
  init(password: string, storedSalt?: string): string {
    // If we have a stored salt, use it — else generate new one
    if (storedSalt) {
      this.appSalt = Buffer.from(storedSalt, 'hex')
    } else {
      this.appSalt = randomBytes(SALT_LENGTH)
    }

    // Derive master key from password using scrypt (slow hash = brute-force resistant)
    this.masterKey = scryptSync(
      password,
      this.appSalt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }
    )

    this.isInitialized = true
    console.log('[Encryption] Service initialized')

    // Return salt as hex so it can be stored (needed to re-derive same key)
    return this.appSalt.toString('hex')
  }

  /**
   * Initialize with a fixed device key (no password — for users without PIN).
   * Key is derived from machine-specific data.
   */
  initWithDeviceKey(machineId: string): string {
    const deviceSecret = `soul-diary-device-${machineId}-offline-secure`
    return this.init(deviceSecret)
  }

  // ── Core Encrypt/Decrypt ───────────────────────────────────────────────────

  /**
   * Encrypt a string value.
   * Returns: "ENC:<base64-json-payload>"
   */
  encrypt(plaintext: string): string {
    if (!this.isInitialized || !this.masterKey) {
      throw new Error('[Encryption] Not initialized. Call init() first.')
    }

    // Empty string — return as is (no point encrypting)
    if (!plaintext) return plaintext

    // Already encrypted — don't double-encrypt
    if (plaintext.startsWith(ENC_PREFIX)) return plaintext

    try {
      // Fresh IV per encryption (NEVER reuse IV with same key)
      const iv = randomBytes(IV_LENGTH)

      // Create cipher
      const cipher = createCipheriv(ALGORITHM, this.masterKey, iv)

      // Encrypt
      const encryptedBuffer = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ])

      // Auth tag (integrity check)
      const tag = cipher.getAuthTag()

      // Build payload
      const payload: EncryptedPayload = {
        salt: this.appSalt!.toString('hex'),
        iv:   iv.toString('hex'),
        tag:  tag.toString('hex'),
        data: encryptedBuffer.toString('hex'),
      }

      // Encode as base64 JSON with prefix
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')
      return `${ENC_PREFIX}${encoded}`
    } catch (err) {
      console.error('[Encryption] Encrypt failed:', err)
      throw new Error('Encryption failed')
    }
  }

  /**
   * Decrypt a value encrypted by encrypt().
   * Returns original plaintext.
   */
  decrypt(ciphertext: string): string {
    if (!this.isInitialized || !this.masterKey) {
      throw new Error('[Encryption] Not initialized. Call init() first.')
    }

    // Not encrypted — return as is
    if (!ciphertext) return ciphertext
    if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext

    try {
      // Strip prefix and decode
      const base64  = ciphertext.slice(ENC_PREFIX.length)
      const json    = Buffer.from(base64, 'base64').toString('utf8')
      const payload = JSON.parse(json) as EncryptedPayload

      // Reconstruct buffers
      const iv   = Buffer.from(payload.iv,   'hex')
      const tag  = Buffer.from(payload.tag,  'hex')
      const data = Buffer.from(payload.data, 'hex')

      // Create decipher
      const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv)
      decipher.setAuthTag(tag)

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final(),
      ])

      return decrypted.toString('utf8')
    } catch (err) {
      console.error('[Encryption] Decrypt failed:', err)
      // Return empty string instead of crashing app
      return ''
    }
  }

  // ── Bulk Operations ────────────────────────────────────────────────────────

  /**
   * Encrypt multiple fields of an object at once.
   * Pass field names to encrypt — rest are left as-is.
   */
  encryptFields<T extends Record<string, any>>(
    obj:    T,
    fields: (keyof T)[]
  ): T {
    const result = { ...obj }
    for (const field of fields) {
      if (result[field] !== null && result[field] !== undefined) {
        result[field] = this.encrypt(String(result[field])) as any
      }
    }
    return result
  }

  /**
   * Decrypt multiple fields of an object at once.
   */
  decryptFields<T extends Record<string, any>>(
    obj:    T,
    fields: (keyof T)[]
  ): T {
    const result = { ...obj }
    for (const field of fields) {
      if (result[field] !== null && result[field] !== undefined) {
        result[field] = this.decrypt(String(result[field])) as any
      }
    }
    return result
  }

  /**
   * Decrypt an array of objects.
   */
  decryptArray<T extends Record<string, any>>(
    arr:    T[],
    fields: (keyof T)[]
  ): T[] {
    return arr.map(item => this.decryptFields(item, fields))
  }

  // ── PIN Management ─────────────────────────────────────────────────────────

  /**
   * Hash a PIN for storage.
   * Uses SHA-256 + salt (not bcrypt — must work without native deps).
   */
  hashPin(pin: string): string {
    const salt = randomBytes(16).toString('hex')
    const hash = createHash('sha256')
      .update(pin + salt)
      .digest('hex')
    // Store as "salt:hash"
    return `${salt}:${hash}`
  }

  /**
   * Verify a PIN against stored hash.
   * Uses timing-safe comparison to prevent timing attacks.
   */
  verifyPin(pin: string, storedHash: string): boolean {
    try {
      const [salt, hash] = storedHash.split(':')
      if (!salt || !hash) return false

      const inputHash = createHash('sha256')
        .update(pin + salt)
        .digest('hex')

      // Timing-safe comparison (prevents timing attacks)
      const hashBuffer  = Buffer.from(hash)
      const inputBuffer = Buffer.from(inputHash)

      if (hashBuffer.length !== inputBuffer.length) return false
      return timingSafeEqual(hashBuffer, inputBuffer)
    } catch {
      return false
    }
  }

  /**
   * Re-encrypt all data with a new password.
   * Called when user changes their PIN.
   */
  reEncryptWithNewKey(
    oldKey:    Buffer,
    newPassword: string,
    values:    string[]
  ): { newSalt: string; reEncrypted: string[] } {
    // Temporarily swap keys to decrypt with old key
    const originalKey  = this.masterKey
    const originalSalt = this.appSalt

    this.masterKey = oldKey

    // Decrypt all values with old key
    const decrypted = values.map(v => this.decrypt(v))

    // Generate new key
    const newSalt    = randomBytes(SALT_LENGTH)
    this.appSalt     = newSalt
    this.masterKey   = scryptSync(
      newPassword,
      newSalt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }
    )

    // Re-encrypt with new key
    const reEncrypted = decrypted.map(v => this.encrypt(v))

    return {
      newSalt:     newSalt.toString('hex'),
      reEncrypted,
    }
  }

  // ── Backup Encryption ──────────────────────────────────────────────────────

  /**
   * Encrypt a full backup file with a user-supplied password.
   * Different from app encryption — standalone backup password.
   */
  encryptBackup(data: string, backupPassword: string): string {
    const salt = randomBytes(SALT_LENGTH)
    const key  = scryptSync(backupPassword, salt, KEY_LENGTH, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
    })
    const iv     = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ])
    const tag = cipher.getAuthTag()

    const payload = {
      version: 1,
      salt:    salt.toString('hex'),
      iv:      iv.toString('hex'),
      tag:     tag.toString('hex'),
      data:    encrypted.toString('hex'),
    }

    return JSON.stringify(payload)
  }

  /**
   * Decrypt a backup file.
   */
  decryptBackup(encryptedJson: string, backupPassword: string): string {
    const payload  = JSON.parse(encryptedJson)
    const salt     = Buffer.from(payload.salt, 'hex')
    const iv       = Buffer.from(payload.iv,   'hex')
    const tag      = Buffer.from(payload.tag,  'hex')
    const data     = Buffer.from(payload.data, 'hex')

    const key      = scryptSync(backupPassword, salt, KEY_LENGTH, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
    })

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    return Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]).toString('utf8')
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /**
   * Check if a string is encrypted by this service.
   */
  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(ENC_PREFIX)
  }

  /**
   * Generate a secure random token (for session tokens, etc).
   */
  generateToken(bytes: number = 32): string {
    return randomBytes(bytes).toString('hex')
  }

  /**
   * Get current master key (needed for re-encryption).
   */
  getMasterKey(): Buffer {
    if (!this.masterKey) {
      throw new Error('[Encryption] Not initialized')
    }
    return Buffer.from(this.masterKey) // return copy
  }

  /**
   * Get current salt (must be stored to re-derive same key on next launch).
   */
  getSalt(): string {
    if (!this.appSalt) {
      throw new Error('[Encryption] Not initialized')
    }
    return this.appSalt.toString('hex')
  }

  get ready(): boolean {
    return this.isInitialized
  }

  /**
   * Clear keys from memory (called on app lock / close).
   */
  clear(): void {
    if (this.masterKey) {
      // Overwrite buffer before releasing (security best practice)
      this.masterKey.fill(0)
      this.masterKey = null
    }
    if (this.appSalt) {
      this.appSalt.fill(0)
      this.appSalt = null
    }
    this.isInitialized = false
    console.log('[Encryption] Keys cleared from memory')
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
export const encryption = new EncryptionService()

// ─── Field lists for each table ───────────────────────────────────────────────
// Use these in db.handler.ts to know which fields to encrypt/decrypt

export const ENTRY_ENCRYPTED_FIELDS = [
  'title', 'content', 'content_plain',
  'mood', 'weather', 'location',
] as const

export const TASK_ENCRYPTED_FIELDS = [
  'title', 'description',
] as const

export const TAG_ENCRYPTED_FIELDS = [
  'name',
] as const

export const HABIT_ENCRYPTED_FIELDS = [
  'name', 'description',
] as const

export const TEMPLATE_ENCRYPTED_FIELDS = [
  'name', 'content', 'description',
] as const

export const PREDICTION_ENCRYPTED_FIELDS = [
  'phrase',
] as const