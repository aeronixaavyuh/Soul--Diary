"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // ══════════════════════════════════════════════════════════════════════════
  //  WINDOW CONTROLS  (Custom titlebar)
  // ══════════════════════════════════════════════════════════════════════════
  window: {
    minimize: () => electron.ipcRenderer.send("window:minimize"),
    maximize: () => electron.ipcRenderer.send("window:maximize"),
    close: () => electron.ipcRenderer.send("window:close"),
    isMaximized: () => electron.ipcRenderer.invoke("window:isMaximized")
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  THEME
  // ══════════════════════════════════════════════════════════════════════════
  theme: {
    get: () => electron.ipcRenderer.invoke("theme:get"),
    set: (theme) => electron.ipcRenderer.send("theme:set", theme)
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  APP INFO
  // ══════════════════════════════════════════════════════════════════════════
  app: {
    version: () => electron.ipcRenderer.invoke("app:version"),
    dataPath: () => electron.ipcRenderer.invoke("app:path"),
    dbPath: () => electron.ipcRenderer.invoke("app:dbPath"),
    lock: () => electron.ipcRenderer.send("app:lock"),
    changeStorage: (path) => electron.ipcRenderer.invoke("app:changeStorage", path),
    init: () => electron.ipcRenderer.invoke("app:init")
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  DIALOGS
  // ══════════════════════════════════════════════════════════════════════════
  dialog: {
    openFolder: () => electron.ipcRenderer.invoke("dialog:openFolder"),
    saveFile: (options) => electron.ipcRenderer.invoke("dialog:saveFile", options)
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  DATABASE  (Raw SQL access — used by entry/task stores)
  // ══════════════════════════════════════════════════════════════════════════
  db: {
    run: (sql, params) => electron.ipcRenderer.invoke("db:run", sql, params ?? []),
    get: (sql, params) => electron.ipcRenderer.invoke("db:get", sql, params ?? []),
    all: (sql, params) => electron.ipcRenderer.invoke("db:all", sql, params ?? [])
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  AI  (Ollama local AI — all offline)
  // ══════════════════════════════════════════════════════════════════════════
  ai: {
    // Availability
    isAvailable: () => electron.ipcRenderer.invoke("ai:isAvailable"),
    // Model management
    models: () => electron.ipcRenderer.invoke("ai:models"),
    getModel: () => electron.ipcRenderer.invoke("ai:getModel"),
    setModel: (name) => electron.ipcRenderer.invoke("ai:setModel", name),
    pullModel: (name) => electron.ipcRenderer.invoke("ai:pullModel", name),
    // Core generation
    query: (prompt, ctx) => electron.ipcRenderer.invoke("ai:query", prompt, ctx),
    // Diary features
    detectMood: (text) => electron.ipcRenderer.invoke("ai:detectMood", text),
    summarize: (text, style) => electron.ipcRenderer.invoke("ai:summarize", text, style ?? "brief"),
    autoTitle: (text) => electron.ipcRenderer.invoke("ai:autoTitle", text),
    // Writing help
    suggestions: (text, type) => electron.ipcRenderer.invoke("ai:suggestions", text, type ?? "continuation"),
    predictWords: (text, count) => electron.ipcRenderer.invoke("ai:predictWords", text, count ?? 3),
    // Ideas
    expandIdea: (idea) => electron.ipcRenderer.invoke("ai:expandIdea", idea),
    // Prompts
    dailyPrompts: (ctx) => electron.ipcRenderer.invoke("ai:dailyPrompts", ctx),
    // Analysis
    analyzeStyle: (text) => electron.ipcRenderer.invoke("ai:analyzeStyle", text),
    extractGratitude: (text) => electron.ipcRenderer.invoke("ai:extractGratitude", text),
    batchMood: (entries) => electron.ipcRenderer.invoke("ai:batchMood", entries)
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  FILE SYSTEM
  // ══════════════════════════════════════════════════════════════════════════
  fs: {
    readFile: (path) => electron.ipcRenderer.invoke("fs:readFile", path),
    writeFile: (path, data) => electron.ipcRenderer.invoke("fs:writeFile", path, data),
    exists: (path) => electron.ipcRenderer.invoke("fs:exists", path),
    mkdir: (path) => electron.ipcRenderer.invoke("fs:mkdir", path)
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  PDF EMPORT
  // ══════════════════════════════════════════════════════════════════════════
  pdf: {
    export: (html, opts) => electron.ipcRenderer.invoke("pdf:export", html, opts ?? {}),
    print: (html) => electron.ipcRenderer.invoke("pdf:print", html),
    open: (filePath) => electron.ipcRenderer.invoke("pdf:open", filePath),
    getExportsPath: () => electron.ipcRenderer.invoke("pdf:getExportsPath")
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  BACKUP
  // ══════════════════════════════════════════════════════════════════════════
  backup: {
    export: (password) => electron.ipcRenderer.invoke("backup:export", password),
    import: (password) => electron.ipcRenderer.invoke("backup:import", password)
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  PIN / SECURITY
  // ══════════════════════════════════════════════════════════════════════════
  pin: {
    set: (pin) => electron.ipcRenderer.invoke("pin:set", pin),
    verify: (pin) => electron.ipcRenderer.invoke("pin:verify", pin),
    remove: () => electron.ipcRenderer.invoke("pin:remove"),
    hasPin: () => electron.ipcRenderer.invoke("pin:hasPin")
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  ENCRYPTION
  // ══════════════════════════════════════════════════════════════════════════
  encryption: {
    init: (password) => electron.ipcRenderer.invoke("encryption:init", password)
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  SETTINGS  (DB-backed key-value)
  // ══════════════════════════════════════════════════════════════════════════
  settings: {
    get: (key) => electron.ipcRenderer.invoke("settings:get", key),
    set: (key, val) => electron.ipcRenderer.invoke("settings:set", key, val),
    getAll: () => electron.ipcRenderer.invoke("settings:getAll")
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  SEARCH
  // ══════════════════════════════════════════════════════════════════════════
  search: {
    query: (q, type) => electron.ipcRenderer.invoke("search:query", q, type)
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════════════════════════════════════
  stats: {
    get: () => electron.ipcRenderer.invoke("stats:get")
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  WORD PREDICTIONS  (Smart typing)
  // ══════════════════════════════════════════════════════════════════════════
  predict: {
    add: (phrase, context) => electron.ipcRenderer.invoke("predict:add", phrase, context),
    get: (prefix, context) => electron.ipcRenderer.invoke("predict:get", prefix, context)
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  EVENT LISTENERS
  //  Main → Renderer events (app lock, auto-save trigger, etc.)
  // ══════════════════════════════════════════════════════════════════════════
  on: (channel, callback) => {
    const allowed = [
      "window:maximized",
      "window:unmaximized",
      "app:beforeClose",
      "app:locked",
      "ai:pullProgress",
      "app:autoSave",
      "app:lowBattery"
    ];
    if (!allowed.includes(channel)) {
      console.warn(`[Preload] Blocked unknown channel: ${channel}`);
      return;
    }
    const handler = (_event, ...args) => {
      callback(...args);
    };
    electron.ipcRenderer.on(channel, handler);
  },
  off: (channel, callback) => {
    electron.ipcRenderer.removeAllListeners(channel);
  },
  once: (channel, callback) => {
    electron.ipcRenderer.once(channel, (_event, ...args) => callback(...args));
  }
});
