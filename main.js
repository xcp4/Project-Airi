/**
 * Airi Desktop Companion - Electron Entry Point
 * Spawns the FastAPI subprocess and manages the transparent, glassmorphic window.
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let pythonProcess = null;

function startPythonBackend() {
  console.log('Spawning Python FastAPI backend subprocess...');
  pythonProcess = spawn('python', [path.join(__dirname, 'backend.py')], {
    stdio: 'inherit'
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start python backend:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 1000,
    minWidth: 500,
    minHeight: 700,
    frame: false,             // Frameless window for beautiful game feel
    transparent: true,        // Transparent window for desktop overlays
    hasShadow: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the React Vite app (port 3000 in dev, index.html in production)
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Only start Python backend in local execution setups
  if (process.env.START_PYTHON === 'true') {
    startPythonBackend();
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (pythonProcess) {
      pythonProcess.kill();
    }
    app.quit();
  }
});
