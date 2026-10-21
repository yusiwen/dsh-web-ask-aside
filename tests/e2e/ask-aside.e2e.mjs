#!/usr/bin/env node
/**
 * End-to-end check for the side-ask flow.
 *
 * Creates a temporary DSH home, installs this checkout as a linked profile
 * bundle, writes a fixture Session with one user turn and one assistant reply,
 * boots `dsh web` on an OS-assigned port, and drives headless Chromium over CDP:
 *
 *   open fixture -> select assistant text -> click the trigger ->
 *   assert the right-sidebar tab and the quoted composer draft.
 *
 * Requirements: `dsh` on PATH, a Chromium-family browser, Node 22.19+ (zstd).
 * Set CHROME to the browser binary, E2E_HOME to reuse a prepared home, and
 * E2E_KEEP=1 to retain the temporary home and browser profile.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { zstdCompressSync } from 'node:zlib'

const REPO = resolve(import.meta.dirname, '../..')
const SESSION_ID = 'session-11111111-1111-4111-8111-111111111111'
const FIXTURE_CWD = '/tmp/dsh-web-ask-aside-fixture'
const FIXTURE_TEXT =
  '这是一段用于验证旁问功能的 fixture 回答。它包含足够长的文本，便于在页面上选中一小段，然后确认右侧分栏里打开了派生会话。'
const FIXTURE_QUESTION = '请解释这段 fixture 内容。'
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))

/** @param {boolean} condition @param {string} message */
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/** @param {string[]} candidates @returns {string | undefined} */
function findBrowser(candidates) {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== '' && existsSync(candidate)) return candidate
  }
  return undefined
}

/** @returns {string | undefined} */
function browserBinary() {
  const home = process.env.HOME ?? ''
  const candidates = [
    process.env.CHROME,
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ]
  const playwrightRoots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    home === '' ? undefined : join(home, '.cache/ms-playwright'),
    home === '' ? undefined : join(home, 'Library/Caches/ms-playwright'),
  ].filter((value) => value !== undefined)
  for (const root of playwrightRoots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root).toSorted().toReversed()) {
      for (const relative of [
        'chrome-linux/headless_shell',
        'chrome-linux/chrome',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      ]) {
        const path = join(root, entry, relative)
        if (existsSync(path)) candidates.push(path)
      }
    }
  }
  return findBrowser(candidates)
}

/** @param {string[]} args @param {Record<string, string>} env @returns {Promise<void>} */
async function run(args, env) {
  const child = spawn(args[0], args.slice(1), { cwd: REPO, env, stdio: 'inherit' })
  const code = await new Promise((resolveExit) => child.on('exit', (value) => resolveExit(value ?? 1)))
  if (code !== 0) throw new Error(`${args.join(' ')} exited ${code}`)
}

/** @param {string} home */
function writeFixtureSession(home) {
  const now = Date.now() - 60_000
  const events = [
    { type: 'session', version: 4, id: SESSION_ID, createdAt: now, cwd: FIXTURE_CWD, isSeeded: false, delegationDepth: 0, agentPreset: 'standard' },
    { type: 'permission/preset', seq: 0, time: now + 1, data: { preset: 'workspace-write' } },
    { type: 'sandbox/mode', seq: 1, time: now + 2, data: { mode: 'workspace-write' } },
    { type: 'approval/policy', seq: 2, time: now + 3, data: { policy: 'ask' } },
    { type: 'agent/inbox/spliced', seq: 3, time: now + 4, data: { target: 'next-turn', start: 0, inserted: [{ content: [{ type: 'text', text: FIXTURE_QUESTION }], source: { kind: 'user', rpcId: 'fixture-rpc', clientTimeZone: 'UTC' }, role: 'user', id: 'fixture-user-1' }] } },
    { type: 'turn/start', seq: 4, time: now + 5, data: { turn: 1 } },
    { type: 'agent/inbox/spliced', seq: 5, time: now + 6, data: { target: 'next-turn', start: 0, removedCount: 1, inserted: [] } },
    { type: 'step/start', seq: 6, time: now + 7, data: { turn: 1, step: 1 } },
    { type: 'user/message', seq: 7, time: now + 8, data: { content: [{ type: 'text', text: FIXTURE_QUESTION }], source: { kind: 'user', rpcId: 'fixture-rpc', clientTimeZone: 'UTC' }, role: 'user', id: 'fixture-user-1' }, surfaceOp: 'append' },
    { type: 'assistant/message', seq: 8, time: now + 9, data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: FIXTURE_TEXT }], source: { kind: 'model', provider: 'fixture', model: 'fixture-model' }, id: 'fixture-assistant-1' }, usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 }, stream: [
      { type: 'chunk', time: now + 9, chunk: { type: 'block-start', index: 0, blockType: 'text' } },
      { type: 'chunk', time: now + 9, chunk: { type: 'block-end', index: 0, block: { type: 'text', text: FIXTURE_TEXT } } },
      { type: 'chunk', time: now + 9, chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } } },
      { type: 'chunk', time: now + 9, chunk: { type: 'finish', reason: { kind: 'stop' } } },
    ] }, surfaceOp: 'append' },
    { type: 'step/end', seq: 9, time: now + 10, data: { turn: 1, step: 1 } },
    { type: 'turn/end', seq: 10, time: now + 11, data: { turn: 1, reason: { kind: 'completed' } } },
  ]
  const header = `${JSON.stringify(events[0])}\n`
  const body = `${events.slice(1).map((event) => JSON.stringify(event)).join('\n')}\n`
  const directory = join(home, 'sessions', `--${FIXTURE_CWD.replace(/^\//, '').replaceAll('/', '-')}--`, SESSION_ID)
  mkdirSync(directory, { recursive: true })
  mkdirSync(FIXTURE_CWD, { recursive: true })
  writeFileSync(join(directory, 'session.v4.jsonl.zstd'), Buffer.concat([
    zstdCompressSync(Buffer.from(header)),
    zstdCompressSync(Buffer.from(body)),
  ]))
  registerFixtureWorkspace(home)
}

/**
 * A Session is discoverable through its Workspace project directory. Register a
 * dedicated workspace so the fixture cwd is scanned without touching any real
 * user workspace.
 * @param {string} home
 */
function registerFixtureWorkspace(home) {
  const id = 'e2e11111-1111-4111-8111-111111111111'
  const now = new Date().toISOString()
  const path = join(home, 'storages', 'workspace.json')
  let document
  if (existsSync(path)) {
    document = JSON.parse(readFileSync(path, 'utf8'))
  } else {
    document = {
      unit: { name: 'workspace', version: 2 },
      global: { initialized: true, workspaceIds: [], archivedSessionIds: [], pinnedSessionIds: [], defaultWorkspaceId: id },
      tables: { workspaces: {} },
    }
    mkdirSync(join(home, 'storages'), { recursive: true })
  }
  const global = document.global
  global.initialized = true
  global.archivedSessionIds ??= []
  global.pinnedSessionIds ??= []
  if (!global.workspaceIds.includes(id)) global.workspaceIds.push(id)
  global.defaultWorkspaceId ??= id
  document.tables ??= { workspaces: {} }
  document.tables.workspaces ??= {}
  document.tables.workspaces[id] = {
    path: FIXTURE_CWD,
    title: 'Ask Aside E2E',
    sessionIds: [SESSION_ID],
    createdAt: now,
    updatedAt: now,
  }
  writeFileSync(path, JSON.stringify(document, null, 2))
}

/** @param {string} home @returns {Promise<{child: import('node:child_process').ChildProcess, url: string}>} server and authenticated URL */
async function startServer(home) {
  const child = spawn('dsh', ['--profile', 'web', '--port', '0', '--no-open'], {
    cwd: REPO,
    env: { ...process.env, DSH_HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const url = await new Promise((resolveUrl, reject) => {
    const timer = setTimeout(() => reject(new Error(`dsh web did not print a URL\n${output}`)), 60_000)
    child.stdout.on('data', (chunk) => {
      output += String(chunk)
      const match = output.match(/dsh web: (http:\/\/\S+)/)
      if (match !== null) {
        clearTimeout(timer)
        resolveUrl(match[1])
      }
    })
    child.stderr.on('data', (chunk) => { output += String(chunk) })
    child.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`dsh web exited ${code}\n${output}`))
    })
  })
  return { child, url }
}

/** @param {string} bin @param {number} port @param {string} profile @returns {Promise<any>} */
async function startBrowser(bin, port, profile) {
  const child = spawn(bin, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--user-data-dir=${profile}`, '--window-size=1600,1000', `--remote-debugging-port=${port}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  let target
  for (let attempt = 0; attempt < 100 && target === undefined; attempt += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      target = list.find((entry) => entry.type === 'page')
    } catch {
      // DevTools is not up yet.
    }
    if (target === undefined) await sleep(200)
  }
  if (target === undefined) throw new Error('browser DevTools endpoint did not start')
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolveOpen, reject) => { ws.addEventListener('open', resolveOpen, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  let sequence = 0
  const pending = new Map()
  const errors = []
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails
      errors.push((details.exception && (details.exception.description || details.exception.value)) || details.text)
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map((argument) => argument.value ?? argument.description ?? argument.type).join(' '))
    }
  })
  const send = (method, params = {}) => {
    const id = ++sequence
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolveResponse) => pending.set(id, resolveResponse))
  }
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.result && response.result.exceptionDetails) throw new Error(JSON.stringify(response.result.exceptionDetails))
    return response.result && response.result.result ? response.result.result.value : undefined
  }
  const clickAt = async (x, y) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
      await sleep(80)
    }
  }
  return { child, send, evaluate, clickAt, errors, close: () => ws.close() }
}

/** @returns {Promise<number>} a free TCP port */
async function freePort() {
  const { createServer } = await import('node:net')
  return new Promise((resolvePort) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolvePort(typeof address === 'object' && address !== null ? address.port : 9400))
    })
  })
}

async function main() {
  if (typeof zstdCompressSync !== 'function') throw new Error('Node 22.19+ is required for zstdCompressSync')
  const dshProbe = spawnSync('dsh', ['--version'], { stdio: 'ignore' })
  if (dshProbe.error !== undefined) {
    console.log('SKIP: dsh is not on PATH; install the DSH CLI to run this e2e')
    return false
  }
  if (dshProbe.status !== 0) throw new Error('dsh --version failed')
  const browser = browserBinary()
  if (browser === undefined) {
    console.log('SKIP: no Chromium-family browser found; set CHROME to run this e2e')
    return false
  }
  const home = process.env.E2E_HOME ?? mkdtempSync(join(tmpdir(), 'dsh-web-ask-aside-e2e-'))
  const browserProfile = mkdtempSync(join(tmpdir(), 'dsh-web-ask-aside-browser-'))
  const keep = process.env.E2E_KEEP === '1' || process.env.E2E_HOME !== undefined
  let server
  let ui
  try {
    console.log(`e2e home: ${home}`)
    console.log(`browser: ${browser}`)
    await run(['dsh', 'plugin', '--profile', 'web', 'add', `link:${REPO}`], { ...process.env, DSH_HOME: home })
    writeFixtureSession(home)
    server = await startServer(home)
    console.log(`server: ${server.url}`)
    const port = await freePort()
    ui = await startBrowser(browser, port, browserProfile)
    await ui.send('Page.enable')
    await ui.send('Runtime.enable')
    await ui.send('Page.navigate', { url: server.url })
    await sleep(7000)
    const boot = await ui.evaluate(`JSON.stringify((globalThis.__DSH_BOOT__?.entries ?? []).map((entry) => entry.id))`)
    assert(boot.includes('dsh-web-ask-aside'), `boot graph does not include dsh-web-ask-aside: ${boot}`)
    console.log('PASS boot graph includes the plugin')
    const rowKey = `session:${SESSION_ID}`
    const clickFixture = async () => ui.evaluate(`(function(){var row=document.querySelector('[data-row-key="${rowKey}"]');if(row===null)return 'missing';row.click();return 'clicked';})()`)
    let row = await clickFixture()
    if (row !== 'clicked') {
      const groups = JSON.parse(await ui.evaluate(`JSON.stringify([...document.querySelectorAll('[data-row-key^="workspace:"]')].map((element) => element.getAttribute('data-row-key')))`))
      for (const group of groups) {
        await ui.evaluate(`(function(){var row=document.querySelector('[data-row-key=${JSON.stringify(group)}]');if(row!==null)row.click();})()`)
        await sleep(800)
        row = await clickFixture()
        if (row === 'clicked') break
      }
      assert(row === 'clicked', `fixture Session row not found (groups: ${JSON.stringify(groups)})`)
    }
    await sleep(4000)
    const mainTurns = await ui.evaluate(`document.querySelectorAll('[data-conversation-scroll]')[0]?.querySelectorAll('[data-chat-turn]').length ?? -1`)
    assert(mainTurns > 0, `fixture conversation did not render: turns=${mainTurns}`)
    const selected = await ui.evaluate(`(function(){
      var nodes=[...document.querySelectorAll('[data-chat-flow-kind="assistant-step"]')];
      if(nodes.length===0)return 'no-assistant';
      var node=nodes[nodes.length-1];
      var range=document.createRange();range.selectNodeContents(node);
      var selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
      document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
      return 'selected';
    })()`)
    assert(selected === 'selected', `assistant text selection failed: ${selected}`)
    await sleep(800)
    const trigger = JSON.parse((await ui.evaluate(`(function(){var button=document.querySelector('[data-side-ask-trigger]');if(button===null)return 'null';var rect=button.getBoundingClientRect();var hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return JSON.stringify({count:document.querySelectorAll('[data-side-ask-trigger]').length,x:rect.left+rect.width/2,y:rect.top+rect.height/2,visible:rect.width>0&&rect.height>0,hit:hit?hit.closest('[data-side-ask-trigger]')!==null:false});})()`)) || 'null')
    assert(trigger !== null && trigger.visible && trigger.hit && trigger.count === 1, `selection trigger not single/clickable: ${JSON.stringify(trigger)}`)
    console.log('PASS single selection trigger is visible and hit-testable')
    await ui.clickAt(trigger.x, trigger.y)
    await sleep(6000)
    const result = JSON.parse(await ui.evaluate(`JSON.stringify({
      tabs: [...document.querySelectorAll('[data-rightbar-col] [data-sidebar-right-tab]')].map((element) => element.innerText.replace(/\\s+/g, ' ').slice(0, 80)),
      editor: (() => { var element = document.querySelector('[data-rightbar-col] [contenteditable="true"]'); return element === null ? null : element.innerText; })(),
      mainTurns: document.querySelectorAll('[data-conversation-scroll]')[0]?.querySelectorAll('[data-chat-turn]').length ?? -1,
    })`))
    assert(result.tabs.length > 0, 'right-sidebar tab did not open')
    assert(typeof result.editor === 'string' && (result.editor.includes('关于这段内容：') || result.editor.includes('About this passage:')), `composer was not seeded: ${JSON.stringify(result.editor)}`)
    assert(result.editor.includes('fixture 回答'), `composer does not contain the quoted passage: ${JSON.stringify(result.editor)}`)
    assert(result.mainTurns === mainTurns, `parent transcript changed: ${mainTurns} -> ${result.mainTurns}`)
    console.log('PASS right-sidebar conversation and quoted draft')
    console.log('PASS parent transcript unchanged')
    assert(ui.errors.length === 0, `console errors:\n${ui.errors.join('\n')}`)
    console.log('PASS no console errors')
    return true
  } finally {
    ui?.close()
    ui?.child.kill('SIGKILL')
    server?.child.kill('SIGKILL')
    await sleep(300)
    if (!keep) {
      rmSync(home, { recursive: true, force: true })
      rmSync(browserProfile, { recursive: true, force: true })
    } else {
      console.log(`kept home: ${home}`)
      console.log(`kept browser profile: ${browserProfile}`)
    }
  }
}

main().then(
  (ran) => { console.log(ran ? 'E2E PASS' : 'E2E SKIP'); process.exit(0) },
  (error) => { console.error('E2E FAIL:', error instanceof Error ? error.message : error); process.exit(1) },
)
