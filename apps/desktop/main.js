// DeepSeek Harness desktop wrapper
// Launches the locally-built dsh web server inside an Electron window.
const { app, BrowserWindow, dialog } = require('electron')
const { spawn, spawnSync } = require('node:child_process')
const http = require('node:http')
const path = require('node:path')
const fs = require('node:fs')

const REPO_ROOT = process.env.DSH_REPO_ROOT || '/Users/seungyeop/workspace/dsh'
const CLI = path.join(REPO_ROOT, 'apps', 'cli', 'lib', 'bin.js')
const HOST = '127.0.0.1'
const STARTUP_TIMEOUT_MS = 60_000
// Ollama launch profile: configurable desktop profile (temperature/top_p/effort via proxy).
const OLLAMA_PATCH = process.env.DSH_PATCH || '/Users/seungyeop/.ollama/launch/dsh/desktop-ollama.cordis.yml'
const PROXY_SCRIPT = process.env.DSH_OLLAMA_PROXY || '/Users/seungyeop/.ollama/launch/dsh/llm-proxy-configurable.mjs'

// Optional Ollama sampling knobs (passed through to the proxy as env vars).
const OLLAMA_TEMPERATURE = process.env.DSH_OLLAMA_TEMPERATURE
const OLLAMA_TOP_P = process.env.DSH_OLLAMA_TOP_P
const OLLAMA_REASONING_EFFORT = process.env.DSH_OLLAMA_REASONING_EFFORT

let serverProcess = null
let proxyProcess = null
let mainWindow = null
let serverUrl = null
let quitting = false

// In a packaged Electron app, process.execPath is the Electron binary, NOT
// Node.js. We must locate a real Node executable to run the dsh CLI.
function findNode() {
  // Inside a packaged Electron app, process.execPath is the Electron binary,
  // NOT Node.js. NEVER use it as a node candidate (it causes infinite
  // recursive spawning of `App --version`).
  const isElectron = !!process.versions.electron
  const candidates = []
  if (process.env.DSH_NODE) candidates.push(process.env.DSH_NODE)
  if (process.env.npm_node_execpath) candidates.push(process.env.npm_node_execpath)
  if (!isElectron && process.execPath) candidates.push(process.execPath)
  candidates.push('/opt/homebrew/bin/node')
  candidates.push('/usr/local/bin/node')
  candidates.push('/Users/seungyeop/.local/share/node-v24.18.0/bin/node')
  candidates.push('node') // last resort: rely on PATH

  for (const candidate of candidates) {
    try {
      const r = spawnSync(candidate, ['--version'], { stdio: 'ignore' })
      if (!r.error && r.status === 0) return candidate
    } catch { /* try next */ }
  }
  return 'node'
}

const NODE = findNode()

function waitForServer(url, timeoutMs = STARTUP_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', retry)
      req.setTimeout(1500, () => {
        req.destroy()
        retry()
      })
    }
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for the dsh web server at ${url}`))
        return
      }
      setTimeout(attempt, 300)
    }
    attempt()
  })
}

function startProxy() {
  return new Promise((resolve, reject) => {
    if (!NODE) {
      reject(new Error('Could not locate a Node.js executable for the Ollama proxy.'))
      return
    }
    if (!fs.existsSync(PROXY_SCRIPT)) {
      // Proxy is optional; if the script is missing, just continue without it.
      console.log('[proxy] configurable proxy not found, skipping')
      resolve()
      return
    }

    const env = { ...process.env }
    if (OLLAMA_TEMPERATURE !== undefined) env.OLLAMA_TEMPERATURE = OLLAMA_TEMPERATURE
    if (OLLAMA_TOP_P !== undefined) env.OLLAMA_TOP_P = OLLAMA_TOP_P
    if (OLLAMA_REASONING_EFFORT !== undefined) env.OLLAMA_REASONING_EFFORT = OLLAMA_REASONING_EFFORT

    const child = spawn(NODE, [PROXY_SCRIPT], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    proxyProcess = child

    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('Timed out while starting the Ollama proxy.'))
        try { child.kill() } catch {}
      }
    }, 15_000)

    const onData = (chunk) => {
      const text = String(chunk)
      process.stdout.write(`[proxy] ${text}`)
      if (/listening on 127\.0\.0\.1:11435/.test(text) && !settled) {
        settled = true
        clearTimeout(timer)
        resolve()
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    })
    child.on('exit', (code) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(new Error(`Ollama proxy exited early (code=${code})`))
      }
    })
  })
}

async function startDsh() {
  // Reuse an already-running server when the window is reopened.
  if (serverUrl) return serverUrl

  // Start the configurable Ollama proxy first, then the dsh web server.
  await startProxy()

  return new Promise((resolve, reject) => {
    if (!NODE) {
      reject(new Error('Could not locate a Node.js executable. Set DSH_NODE to the node binary path.'))
      return
    }
    if (!fs.existsSync(CLI)) {
      reject(new Error(`Built dsh CLI not found at ${CLI}.\n\nPlease build the repository first with:\n  pnpm run build`))
      return
    }

    const args = [CLI, 'web']
    if (OLLAMA_PATCH) {
      args.push('--patch', OLLAMA_PATCH)
    }
    args.push('--host', HOST, '--port', '0')

    // Ollama is local and does not need a real key; provide a dummy so dsh
    // does not prompt for an API key on every launch.
    const dshEnv = { ...process.env }
    if (!dshEnv.OLLAMA_LAUNCH_DSH_API_KEY) {
      dshEnv.OLLAMA_LAUNCH_DSH_API_KEY = 'ollama-local'
    }

    const child = spawn(NODE, args, {
      cwd: REPO_ROOT,
      env: dshEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    serverProcess = child

    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('Timed out while starting the dsh web server.'))
        try { child.kill() } catch {}
      }
    }, STARTUP_TIMEOUT_MS)

    const onData = (chunk) => {
      const text = String(chunk)
      process.stdout.write(`[dsh] ${text}`)
      const m = text.match(/dsh web: (http:\/\/[^\s]+)/)
      if (m && !settled) {
        settled = true
        clearTimeout(timer)
        serverUrl = m[1]
        resolve(m[1])
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)

    child.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    })
    child.on('exit', (code, signal) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(new Error(`dsh web exited early (code=${code}, signal=${signal})`))
      } else if (!quitting) {
        console.log('[dsh] server exited')
        if (mainWindow && !mainWindow.isDestroyed()) {
          dialog.showErrorBox('DeepSeek Harness stopped', `The dsh web server exited unexpectedly (code=${code}).`)
          app.exit(1)
        }
      }
    })
  })
}

async function createWindow() {
  let url
  try {
    url = await startDsh()
  } catch (err) {
    dialog.showErrorBox('DeepSeek Harness failed to start', String((err && err.message) || err))
    app.exit(1)
    return
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'DeepSeek Harness',
    backgroundColor: '#0d0d0d',
    icon: path.join(__dirname, 'assets', 'icon.icns'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.loadURL(url)
  mainWindow.on('closed', () => {
    // Keep the app and dsh server running; reopen from the Dock.
    mainWindow = null
  })
}

// Prevent multiple dock icons / duplicate server instances.
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

  app.whenReady().then(createWindow)

  app.on('window-all-closed', () => {
    // On macOS keep the app (and dsh server) alive in the Dock.
    if (process.platform !== 'darwin') {
      quitting = true
      if (serverProcess) {
        try { serverProcess.kill('SIGTERM') } catch {}
      }
      if (proxyProcess) {
        try { proxyProcess.kill('SIGTERM') } catch {}
      }
      app.quit()
    }
  })

  // Reopen a window when the Dock icon is clicked.
  app.on('activate', () => {
    if (mainWindow === null) {
      void createWindow()
    }
  })

  app.on('before-quit', () => {
    quitting = true
    if (serverProcess) {
      try { serverProcess.kill('SIGTERM') } catch {}
    }
    if (proxyProcess) {
      try { proxyProcess.kill('SIGTERM') } catch {}
    }
  })
}
