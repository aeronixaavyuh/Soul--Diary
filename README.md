# Soul Diary

Your private, encrypted personal diary — built with Electron, React, and SQLite.

Soul Diary is a desktop journaling app that goes beyond a simple diary. It combines daily journaling with task management, notes, and idea capture, all stored **locally on your device**. No cloud, no internet sync — your thoughts stay yours.

> Built with help from **Claude AI**.

---

## ✨ Features

- **📔 Diary / Journal** — Write daily entries with a rich text editor (formatting, highlights, text alignment, and more)
- **✅ Tasks** — Keep track of to-dos and daily tasks alongside your journal
- **🗒️ Notes** — Capture quick notes and longer thoughts separately from your diary
- **💡 Ideas** — A dedicated space to jot down ideas before they slip away
- **🕒 Timeline** — View your entries and activity in chronological order
- **🔒 Lock Screen** — App-level lock to keep your diary private
- **⚙️ Settings** — Customize the app to your preference
- **🎨 Animated backgrounds & themes** — A calm, distraction-free writing experience
- **💾 100% Local Storage** — All data is stored locally using SQLite. Nothing is uploaded or synced online.

---

## 🛠️ Tech Stack

- **Electron** — Cross-platform desktop app shell
- **React + TypeScript** — UI layer
- **Vite (electron-vite)** — Build tooling
- **Tailwind CSS** — Styling
- **Tiptap** — Rich text editor for journal entries
- **better-sqlite3** — Local, embedded database
- **Zustand** — State management
- **Framer Motion** — Animations

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm

### Installation

```bash
git clone https://github.com/<your-username>/soul-diary.git
cd soul-diary
npm install
```

### Run in development mode

```bash
npm run dev
```

### Build for production

```bash
npm run dist
```

This will generate a Windows installer (`.exe`) inside the `release/` folder.

You can also build for a specific platform:

```bash
npm run package:win     # Windows
npm run package:mac     # macOS
npm run package:linux   # Linux
```

---

## 🔐 Privacy

Soul Diary stores all your data locally on your machine using SQLite. There is **no internet connection, account, or cloud sync required or used** by this app. Your diary entries, tasks, and notes never leave your device.

---

## 📄 License

This project is private and intended for personal use.

---

## 🙏 Acknowledgements

Built with the help of **Claude AI** (Anthropic) for development assistance and debugging.
