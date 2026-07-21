# 🌸 Airi — AI Desktop Companion

> **A modern AI desktop companion inspired by visual novels, powered by Google Gemini and React.**

![Status](https://img.shields.io/badge/status-alpha-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Node.js](https://img.shields.io/badge/Node.js-22-green)

---

# ✨ Overview

Airi is an experimental AI desktop companion that combines:

* 💬 Natural conversations
* 🧠 Cognitive memory
* 😊 Emotion simulation
* 🎭 Animated character behaviors
* 🔊 Real-time voice synthesis
* 🌐 Browser automation
* 🛠 Tool calling system

The long-term goal is to create a true desktop AI assistant similar to **Jarvis**, presented as an anime companion.

---

# 🚀 Features

### 🧠 AI Brain

* Google Gemini integration
* Context-aware conversations
* Emotion engine
* Memory extraction
* Goal planning
* Behavior planning

### 🎭 Character System

* State Machine animations
* Emotion-driven reactions
* Mouse tracking
* Lip sync
* Idle behaviors

### 🛠 Skills

* Browser automation
* Web search
* Calculator
* Clipboard
* File system
* Notifications
* Calendar
* Vision

### ⚡ Performance

* Response caching
* Feature toggles
* Loading manager
* Error recovery
* Tool execution queue
* Browser connection manager

---

# 🏗 Architecture

```
Electron
      │
      ▼
React Frontend
      │
      ▼
Express Server
      │
      ▼
Companion Brain
      │
      ├── Emotion Engine
      ├── Memory System
      ├── Behavior Planner
      ├── Skill Planner
      └── Google Gemini
```

---

# 🛠 Tech Stack

* React 19
* TypeScript
* Vite
* Express
* Google Gemini API
* Playwright
* WebSocket
* Electron

---
# 📦 Installation

## Requirements

* Node.js 22+
* npm
* Google Gemini API Key

---

## Clone the repository

```bash
git clone https://github.com/USERNAME/Airi.git
cd Airi
```

---

## Install dependencies

```bash
npm install
```

---

## Configure environment

Create a `.env` file in the project root.

```env
GEMINI_API_KEY=YOUR_API_KEY
APP_URL=http://localhost:3000
```

---

## Run in development

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## Build

```bash
npm run build
```

---

## Start production

```bash
npm start
```

---

# 📁 Project Structure

```
Airi
├── src/
│   ├── components/
│   ├── services/
│   ├── brain/
│   ├── animations/
│   └── skills/
│
├── public/
│   └── assets/
│
├── server.ts
├── package.json
└── README.md
```

---

# ⚙ Environment Variables

| Variable       | Description                  |
| -------------- | ---------------------------- |
| GEMINI_API_KEY | Google Gemini API Key        |
| APP_URL        | Local or deployed server URL |

---

# 🐞 Known Issues

* Browser automation is still experimental.
* Free Gemini API has strict rate limits.
* Some features require Chrome remote debugging.
* Offline mode is still under development.

---

# ⚠ Current Status

This project is currently in **Alpha**.

Some systems are still under active development:

* Browser automation
* Long-term memory
* Voice pipeline
* Character package system
* Tool ecosystem

---

# 📅 Roadmap

* [x] Emotion Engine
* [x] Companion Brain
* [x] Tool System
* [x] Browser Integration
* [x] TTS Support
* [ ] Vision Improvements
* [ ] Character Marketplace
* [ ] Plugin SDK
* [ ] Offline AI Mode
* [ ] Local LLM Support
* [ ] Multi-character Support

---

# 🤝 Contributing

Contributions, ideas, bug reports and pull requests are welcome.

---

# ⭐ Support

If you like this project, please consider giving it a **⭐ Star**.

It helps the project grow.

---

# 📜 License

MIT License

---

**Made with ❤️ by Ali**
