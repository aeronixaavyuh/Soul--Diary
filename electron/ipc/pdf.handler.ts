import { ipcMain, BrowserWindow, dialog, app, shell } from 'electron'
import * as path from 'path'
import * as fs   from 'fs'

export function registerPdfHandlers() {

  // ── PDF Export ─────────────────────────────────────────────────────────────
  ipcMain.handle('pdf:export', async (_event, html: string, opts: {
    title?: string
  } = {}) => {
    let win: BrowserWindow | null = null

    try {
      // 1. Hidden window banao
      win = new BrowserWindow({
        width:  1200,
        height: 900,
        show:   false,
        webPreferences: {
          nodeIntegration:  false,
          contextIsolation: true,
          javascript:       true,
        },
      })

      // 2. HTML load karo
      const encoded = encodeURIComponent(html)
      await win.loadURL(`data:text/html;charset=utf-8,${encoded}`)

      // 3. Render hone do
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 4. PDF generate karo
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground:   true,
        pageSize:          'A4',
        preferCSSPageSize: false,
      })

      // 5. Window band karo
      win.destroy()
      win = null

      // 6. Save dialog
      const safeName = (opts.title ?? 'soul-diary')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 40) || 'soul-diary'

      const today = new Date().toISOString().split('T')[0]

      const { filePath, canceled } = await dialog.showSaveDialog({
        title:       'Save PDF',
        defaultPath: path.join(
          app.getPath('documents'),
          `${safeName}-${today}.pdf`
        ),
        filters:     [{ name: 'PDF', extensions: ['pdf'] }],
        buttonLabel: 'Save PDF',
      })

      if (canceled || !filePath) {
        return { success: false, canceled: true }
      }

      // 7. File save karo
      fs.writeFileSync(filePath, pdfBuffer)

      return {
        success:  true,
        filePath,
        sizeKB:   Math.round(pdfBuffer.length / 1024),
      }

    } catch (err: any) {
      // Cleanup agar window reh gayi
      if (win && !win.isDestroyed()) {
        win.destroy()
      }
      console.error('[PDF] Export error:', err?.message)
      return {
        success: false,
        error:   err?.message ?? 'PDF generation failed',
      }
    }
  })

  // ── Open PDF ───────────────────────────────────────────────────────────────
  ipcMain.handle('pdf:open', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message }
    }
  })

  // ── Print ──────────────────────────────────────────────────────────────────
  ipcMain.handle('pdf:print', async (_event, html: string) => {
    let win: BrowserWindow | null = null
    try {
      win = new BrowserWindow({
        width:  1200,
        height: 900,
        show:   true,
        title:  'Soul Diary — Print',
        webPreferences: {
          nodeIntegration:  false,
          contextIsolation: true,
        },
      })

      const encoded = encodeURIComponent(html)
      await win.loadURL(`data:text/html;charset=utf-8,${encoded}`)
      await new Promise(resolve => setTimeout(resolve, 1000))

      win.webContents.print(
        {
          silent:          false,
          printBackground: true,
          color:           true,
        },
        (_success, _reason) => {
          setTimeout(() => {
            if (win && !win.isDestroyed()) win.destroy()
          }, 1000)
        }
      )

      return { success: true }
    } catch (err: any) {
      if (win && !win.isDestroyed()) win.destroy()
      return { success: false, error: err?.message }
    }
  })

  // ── Exports folder path ────────────────────────────────────────────────────
  ipcMain.handle('pdf:getExportsPath', async () => {
    try {
      const exportsPath = path.join(
        app.getPath('documents'),
        'Soul Diary Exports'
      )
      if (!fs.existsSync(exportsPath)) {
        fs.mkdirSync(exportsPath, { recursive: true })
      }
      return { success: true, path: exportsPath }
    } catch (err: any) {
      return { success: false, error: err?.message }
    }
  })
}