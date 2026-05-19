import {
    app,
    BrowserWindow,
    ipcMain,
    shell,
    dialog,
    nativeTheme,
} from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// ── Services ──────────────────────────────────────────────────────────────────
import { db } from './services/database'
import { encryption } from './services/encryption'

// ── IPC Handlers ──────────────────────────────────────────────────────────────
import { registerDbHandlers } from './ipc/db.handler'
import { registerAiHandlers } from './ipc/ai.handler'

import { registerPdfHandlers } from './ipc/pdf.handler'

// ─────────────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null

// ─── Create Window ────────────────────────────────────────────────────────────

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        show: false,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0f0f1a',
        webPreferences: {
            preload: join(__dirname, '../preload/preload.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
        icon: join(__dirname, '../../public/icon.png'),
    })

    // Show only when fully ready — prevents white flash
    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
        // Send maximize state to renderer
        mainWindow?.webContents.send(
            mainWindow.isMaximized() ? 'window:maximized' : 'window:unmaximized'
        )
    })

    // Notify renderer on maximize/unmaximize
    mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized'))
    mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:unmaximized'))

    // Auto-save on close
    mainWindow.on('close', () => {
        mainWindow?.webContents.send('app:beforeClose')
    })

    // Open external links in system browser
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // Load app
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        // Open DevTools detached in dev mode
        mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// ─── Initialize Services ──────────────────────────────────────────────────────

async function initServices(): Promise<void> {
    try {
        // 1. Init database
        const customPath = getCustomStoragePath()
        db.init(customPath ?? undefined)
        console.log('[Main] Database initialized ✓')

        // 2. Init encryption
        //    If user has no PIN → device key mode (transparent, no password needed)
        const hasPin = db.getSetting('hasPin') === 'true'
        if (!hasPin) {
            const machineId = db.getSetting('machineId') ?? generateMachineId()
            db.setSetting('machineId', machineId)

            const storedSalt = db.getSetting('encSalt')
            const salt = encryption.initWithDeviceKey(machineId)

            // Store salt on first run
            if (!storedSalt) {
                db.setSetting('encSalt', salt)
            }
            console.log('[Main] Encryption initialized (device key) ✓')
        } else {
            // PIN-based: encryption will be fully init after PIN verify in renderer
            // But we still need a partial init so DB reads work for settings
            console.log('[Main] PIN set — waiting for PIN verify to fully init encryption')
        }

        // 3. Register all IPC handlers
        registerDbHandlers()
        registerAiHandlers()
        console.log('[Main] AI handlers registered ✓')
        registerWindowHandlers()
        registerFileHandlers()
        registerAppHandlers()
        console.log('[Main] All IPC handlers registered ✓')

    } catch (err) {
        console.error('[Main] Service init failed:', err)
    }
}

// ─── Window IPC Handlers ──────────────────────────────────────────────────────

function registerWindowHandlers(): void {
    ipcMain.on('window:minimize', () => mainWindow?.minimize())

    ipcMain.on('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow?.maximize()
        }
    })

    ipcMain.on('window:close', () => {
        // Give renderer 800ms to auto-save before closing
        mainWindow?.webContents.send('app:beforeClose')
        setTimeout(() => mainWindow?.destroy(), 800)
    })

    ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

    // Theme
    ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)
    ipcMain.on('theme:set', (_e, theme: 'dark' | 'light' | 'system') => {
        nativeTheme.themeSource = theme
    })
}

// ─── File System IPC Handlers ─────────────────────────────────────────────────

function registerFileHandlers(): void {
    // Open folder picker dialog
    ipcMain.handle('dialog:openFolder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Choose Storage Location',
        })
        return result.canceled ? null : result.filePaths[0]
    })

    // Save file dialog
    ipcMain.handle('dialog:saveFile', async (_e, options: Electron.SaveDialogOptions) => {
        const result = await dialog.showSaveDialog(options)
        return result.canceled ? null : result.filePath
    })

    // Read file
    ipcMain.handle('fs:readFile', (_e, filePath: string) => {
        try {
            if (!existsSync(filePath)) return null
            return readFileSync(filePath, 'utf-8')
        } catch (err) {
            console.error('[FS] readFile error:', err)
            return null
        }
    })

    // Write file
    ipcMain.handle('fs:writeFile', (_e, filePath: string, data: string) => {
        try {
            writeFileSync(filePath, data, 'utf-8')
            return { success: true }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    })

    // Check if file/folder exists
    ipcMain.handle('fs:exists', (_e, filePath: string) => {
        return existsSync(filePath)
    })

    // Create directory
    ipcMain.handle('fs:mkdir', (_e, dirPath: string) => {
        try {
            mkdirSync(dirPath, { recursive: true })
            return { success: true }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    })

    // Export encrypted backup
    ipcMain.handle('backup:export', async (_e, backupPassword: string) => {
        try {
            // Get all data from DB
            const entries = db.all('SELECT * FROM entries')
            const tasks = db.all('SELECT * FROM tasks')
            const tags = db.all('SELECT * FROM tags')
            const habits = db.all('SELECT * FROM habits')
            const habitLogs = db.all('SELECT * FROM habit_logs')
            const templates = db.all('SELECT * FROM templates')
            const settings = db.getAllSettings()

            const backupData = JSON.stringify({
                version: 1,
                exportedAt: new Date().toISOString(),
                entries, tasks, tags, habits,
                habitLogs, templates, settings,
            })

            // Encrypt backup with user-supplied password
            const encrypted = encryption.encryptBackup(backupData, backupPassword)

            // Ask where to save
            const result = await dialog.showSaveDialog({
                title: 'Save Backup',
                defaultPath: `soul-diary-backup-${today()}.sdbackup`,
                filters: [{ name: 'Soul Diary Backup', extensions: ['sdbackup'] }],
            })

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'Cancelled' }
            }

            writeFileSync(result.filePath, encrypted, 'utf-8')
            return { success: true, path: result.filePath }
        } catch (err: any) {
            console.error('[Backup] Export failed:', err)
            return { success: false, error: err.message }
        }
    })

    // Import encrypted backup
    ipcMain.handle('backup:import', async (_e, backupPassword: string) => {
        try {
            const result = await dialog.showOpenDialog({
                title: 'Open Backup File',
                filters: [{ name: 'Soul Diary Backup', extensions: ['sdbackup'] }],
                properties: ['openFile'],
            })

            if (result.canceled || !result.filePaths[0]) {
                return { success: false, error: 'Cancelled' }
            }

            const encrypted = readFileSync(result.filePaths[0], 'utf-8')
            const decrypted = encryption.decryptBackup(encrypted, backupPassword)
            const data = JSON.parse(decrypted)

            // Restore inside a transaction
            db.transaction(() => {
                // Clear existing data
                db.run('DELETE FROM entry_tags')
                db.run('DELETE FROM task_tags')
                db.run('DELETE FROM entries')
                db.run('DELETE FROM tasks')
                db.run('DELETE FROM tags')
                db.run('DELETE FROM habits')
                db.run('DELETE FROM habit_logs')
                db.run('DELETE FROM templates')

                // Re-insert from backup
                for (const entry of data.entries ?? []) {
                    db.run(`INSERT OR REPLACE INTO entries VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                        [
                            entry.id, entry.type, entry.title, entry.content,
                            entry.content_plain, entry.mood, entry.mood_score,
                            entry.color, entry.cover_image, entry.is_favorite,
                            entry.is_pinned, entry.is_deleted, entry.word_count,
                            entry.char_count, entry.read_time, entry.weather,
                            entry.location, entry.template_id, entry.version,
                            entry.created_at, entry.updated_at, entry.entry_date,
                        ]
                    )
                }

                for (const task of data.tasks ?? []) {
                    db.run(`INSERT OR REPLACE INTO tasks VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                        [
                            task.id, task.title, task.description, task.status,
                            task.priority, task.due_date, task.reminder_at,
                            task.is_deleted, task.is_pinned, task.sort_order,
                            task.parent_id, task.entry_id,
                            task.created_at, task.updated_at, task.completed_at,
                        ]
                    )
                }

                for (const tag of data.tags ?? []) {
                    db.run(
                        'INSERT OR REPLACE INTO tags VALUES (?,?,?,?,?)',
                        [tag.id, tag.name, tag.color, tag.icon, tag.created_at]
                    )
                }
            })

            return { success: true }
        } catch (err: any) {
            console.error('[Backup] Import failed:', err)
            return { success: false, error: err.message }
        }
    })
}

// ─── App IPC Handlers ─────────────────────────────────────────────────────────

function registerAppHandlers(): void {
    ipcMain.handle('app:version', () => app.getVersion())
    ipcMain.handle('app:path', () => app.getPath('userData'))
    ipcMain.handle('app:dbPath', () => db.getPath())
    ipcMain.handle('app:init', () => ({
        success: true,
        version: app.getVersion(),
        userDataPath: app.getPath('userData'),
        dbPath: db.getPath(),
    }))

    // Lock: clear encryption keys from memory
    ipcMain.on('app:lock', () => {
        encryption.clear()
        mainWindow?.webContents.send('app:locked')
    })

    // Change storage location
    ipcMain.handle('app:changeStorage', async (_e, newPath: string) => {
        try {
            db.setSetting('customStoragePath', newPath)
            return { success: true }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    })
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getCustomStoragePath(): string | null {
    try {
        // Read from a small config file next to the exe
        const configPath = join(app.getPath('userData'), 'storage.config')
        if (existsSync(configPath)) {
            return readFileSync(configPath, 'utf-8').trim()
        }
    } catch { /* ignore */ }
    return null
}

function generateMachineId(): string {
    // Simple: hash of app data path + random
    const base = app.getPath('userData') + Math.random().toString(36)
    let hash = 0
    for (let i = 0; i < base.length; i++) {
        hash = ((hash << 5) - hash) + base.charCodeAt(i)
        hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(8, '0') +
        Date.now().toString(16)
}

function today(): string {
    return new Date().toISOString().split('T')[0]
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.souldiary.app')

    // Keyboard shortcut optimizer (dev tools on F12)
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // Init all services first, then create window
    await initServices()
    createWindow()
    registerPdfHandlers()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit on all windows closed (except macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Clean shutdown
        encryption.clear()
        db.close()
        app.quit()
    }
})

// macOS: clean up on quit
app.on('before-quit', () => {
    encryption.clear()
    db.close()
})

// Single instance lock — prevent multiple windows
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })
}