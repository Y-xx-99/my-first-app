import { useState, useEffect } from 'react'

// ============================================================
// ★ 后端地址：一个变量管到底，不用再到处改
//   ① 本地开发（npm run dev）→ 连本机 3001 端口的 Node 后端
//   ② 线上部署在 Cloudflare Pages 同一域名下 → 用空串，走相对路径 /api/...
//   ③ 线上但前端在别的地方（比如 GitHub Pages）→ 用下面这个云端地址
// ============================================================
const LOCAL_API = 'http://localhost:3001'
const CLOUD_API = 'https://ai-first-app.pages.dev' // ← 部署后确认这个名字
const API_BASE = import.meta.env.DEV
  ? LOCAL_API
  : location.hostname.endsWith('pages.dev')
    ? ''
    : CLOUD_API

// 身份证（token）存在浏览器的哪个抽屉里
const TOKEN_KEY = 'ai-token'

function App() {
  const city = '杭州'
  const lessons = [
    '第 1 阶段：Node 脚本 ✅',
    '第 2 阶段：网页 + 部署 ✅',
    '第 3 阶段：大模型 API ✅ 数据库 ✅ 用户体系 ✅',
    '第 4 阶段：迈向第一步',
  ]

  // ---- 登录状态 ----
  const [token, setToken] = useState('') // 身份证
  const [user, setUser] = useState(null) // null = 没登录
  const [authReady, setAuthReady] = useState(false) // 是否已经问完后端"我还登录着吗"
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'
  const [formName, setFormName] = useState('')
  const [formPwd, setFormPwd] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // ---- 长文总结 ----
  const [article, setArticle] = useState('')
  const [result, setResult] = useState(null)
  const [sumLoading, setSumLoading] = useState(false)

  // ---- 历史记录（存在数据库里，只有自己能看）----
  const [history, setHistory] = useState([])

  // ---- AI 待办助手（function calling）----
  const [todoInput, setTodoInput] = useState('')
  const [todoReply, setTodoReply] = useState('（还没说话）')
  const [todos, setTodos] = useState([])
  const [todoLoading, setTodoLoading] = useState(false)

  // ---- 问答功能 ----
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('（还没问）')
  const [askLoading, setAskLoading] = useState(false)

  // ---- 小练习（保留）----
  const [count, setCount] = useState(0)
  const [quote, setQuote] = useState('点下面的按钮，获取一句话')

  // ============================================================
  // ★ 统一的请求函数：自动带上"身份证"，401 就踢回登录页
  //   （以后加接口只写业务，不用再操心 token）
  // ============================================================
  async function api(path, opts = {}) {
    const tk = opts.tk !== undefined ? opts.tk : token
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
    const data = await res.json().catch(() => ({}))

    // 身份证过期/无效 → 清掉本地状态，让界面回到登录页
    if (res.status === 401 && path !== '/api/login' && path !== '/api/register') {
      localStorage.removeItem(TOKEN_KEY)
      setToken('')
      setUser(null)
      throw new Error(data.error || '登录已失效，请重新登录')
    }
    if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
    return data
  }

  async function loadHistory(tk) {
    try {
      const data = await api('/api/history', { tk })
      setHistory(data.history || [])
    } catch (e) {
      console.warn('拉历史失败：', e.message)
    }
  }

  // ★ 页面第一次打开：抽屉里有身份证 → 问后端"我还登录着吗"
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (!saved) {
      setAuthReady(true)
      return
    }
    fetch(`${API_BASE}/api/me`, { headers: { Authorization: `Bearer ${saved}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('失效'))))
      .then((d) => {
        setToken(saved)
        setUser({ username: d.username })
        loadHistory(saved)
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setAuthReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 注册 / 登录 ----
  async function submitAuth() {
    setAuthError('')
    setAuthLoading(true)
    try {
      const data = await api(authMode === 'login' ? '/api/login' : '/api/register', {
        method: 'POST',
        body: { username: formName.trim(), password: formPwd },
        tk: '', // 还没登录，自然没身份证
      })
      localStorage.setItem(TOKEN_KEY, data.token) // 身份证存进浏览器抽屉
      setToken(data.token)
      setUser({ username: data.username })
      setFormPwd('')
      loadHistory(data.token)
    } catch (e) {
      setAuthError(e.message)
    } finally {
      setAuthLoading(false)
    }
  }

  // ---- 退出登录：把这张身份证在服务器上也作废 ----
  async function doLogout() {
    try {
      await api('/api/logout', { method: 'POST', body: {} })
    } catch (e) {
      console.warn(e.message)
    }
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser(null)
    setHistory([])
    setTodos([])
    setResult(null)
    setTodoReply('（还没说话）')
    setAnswer('（还没问）')
  }

  // ---- 长文总结 ----
  async function summarize() {
    setSumLoading(true)
    setResult(null)
    try {
      const data = await api('/api/summarize', { method: 'POST', body: { text: article } })
      setResult(data)
      loadHistory() // 存进数据库了，顺便刷新历史列表
    } catch (e) {
      setResult({ title: '出错了', points: [e.message], tags: [] })
    } finally {
      setSumLoading(false)
    }
  }

  // ---- 待办助手：一句话交给后端，模型自己决定调不调工具 ----
  async function askAgent() {
    if (todoInput.trim() === '') return
    setTodoLoading(true)
    setTodoReply('思考中…')
    try {
      const data = await api('/api/agent', { method: 'POST', body: { message: todoInput } })
      setTodoReply(data.reply)
      setTodos(data.todos || [])
      setTodoInput('')
    } catch (e) {
      setTodoReply('出错了：' + e.message)
    } finally {
      setTodoLoading(false)
    }
  }

  async function askAI() {
    setAskLoading(true)
    setAnswer('思考中…')
    try {
      const data = await api('/api/ask', { method: 'POST', body: { question } })
      setAnswer(data.answer)
    } catch (e) {
      setAnswer('出错了：' + e.message)
    } finally {
      setAskLoading(false)
    }
  }

  async function fetchQuote() {
    const res = await fetch('https://v1.hitokoto.cn/')
    const data = await res.json()
    setQuote(data.hitokoto + ' —— ' + data.from)
  }

  // ============================================================
  // 界面
  // ============================================================

  // ① 还在确认登录状态
  if (!authReady) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>加载中…</div>
  }

  // ② 没登录 → 只显示登录 / 注册卡片（其他功能全部不渲染）
  if (!user) {
    const isLogin = authMode === 'login'
    return (
      <div style={{ maxWidth: 360, margin: '70px auto', padding: 26, fontFamily: 'sans-serif', border: '1px solid #eee', borderRadius: 14 }}>
        <h1 style={{ fontSize: 22, margin: '0 0 6px' }}>🔐 AI 工具箱</h1>
        <p style={{ color: '#666', fontSize: 14, margin: '0 0 18px' }}>
          {isLogin ? '登录后，你的待办和总结只有你自己能看见。' : '注册一个账号，你的数据只有你能看见。'}
        </p>

        <input
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="用户名（至少 2 个字）"
          style={{ width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <input
          type="password"
          value={formPwd}
          onChange={(e) => setFormPwd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitAuth()
          }}
          placeholder="密码（至少 6 位）"
          style={{ width: '100%', padding: 10, marginBottom: 12, boxSizing: 'border-box' }}
        />
        <button
          onClick={submitAuth}
          disabled={authLoading}
          style={{ width: '100%', padding: 11, cursor: 'pointer' }}
        >
          {authLoading ? '处理中…' : isLogin ? '登录' : '注册并开始用'}
        </button>

        {authError && <p style={{ color: 'crimson', fontSize: 14 }}>❌ {authError}</p>}

        <p style={{ marginTop: 16, fontSize: 14 }}>
          {isLogin ? '还没有账号？' : '已经有账号了？'}
          <button
            onClick={() => {
              setAuthMode(isLogin ? 'register' : 'login')
              setAuthError('')
            }}
            style={{ border: 'none', background: 'none', color: '#4a90d9', cursor: 'pointer', padding: 0, marginLeft: 4, textDecoration: 'underline' }}
          >
            {isLogin ? '注册一个' : '去登录'}
          </button>
        </p>
      </div>
    )
  }

  // ③ 已登录 → 正常界面
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ marginBottom: 0 }}>你好，{user.username} 👋</h1>
        <button onClick={doLogout} style={{ cursor: 'pointer' }}>
          退出登录
        </button>
      </div>
      <p>
        我在学习 AI 应用开发——下面是我做的第一批 AI 小工具 👇
        <br />
        <span style={{ color: '#888', fontSize: 13 }}>
          你的待办和总结都盖了主人章，别人登录也看不到。
        </span>
      </p>

      <hr />

      <h2>🤖 AI 待办助手（function calling）</h2>
      <p>
        对 AI 说话就行，它自己决定要不要"动手"：
        <br />「帮我记一下：明天买牛奶」 / 「我有哪些待办？」
      </p>
      <input
        value={todoInput}
        onChange={(e) => setTodoInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') askAgent()
        }}
        placeholder="对 AI 说点什么…"
        style={{ width: 320 }}
      />
      <button onClick={askAgent} disabled={todoLoading}>
        {todoLoading ? '处理中…' : '发送'}
      </button>
      <p>
        <strong>AI 回复：</strong>
        {todoReply}
      </p>

      <h3>🗒️ 我的待办（数据库里的，只有我能看）</h3>
      {todos.length === 0 && <p style={{ color: '#888' }}>还没有待办</p>}
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {t.done ? '✅' : '⬜'} {t.text}
            <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>{t.created_at}</span>
          </li>
        ))}
      </ul>

      <hr />

      <h2>📝 AI 长文总结器</h2>
      <p>把你的长文贴进下面，AI 会输出一份<strong>结构化</strong>总结，并自动存进数据库。</p>
      <textarea
        value={article}
        onChange={(e) => setArticle(e.target.value)}
        rows={8}
        placeholder="把你的长文贴到这里……"
      />
      <br />
      <button onClick={summarize} disabled={sumLoading}>
        {sumLoading ? '总结中…' : '总结成要点'}
      </button>

      {result && (
        <div style={{ marginTop: 14, padding: 16, background: '#f7f7f8', borderRadius: 10 }}>
          <h3 style={{ margin: '0 0 8px' }}>{result.title}</h3>
          <ul style={{ margin: '0 0 8px', paddingLeft: 20 }}>
            {(result.points || []).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p style={{ margin: 0, color: '#666' }}>
            {(result.tags || []).map((t) => `#${t}`).join('  ')}
          </p>
        </div>
      )}

      <hr />

      <h2>📚 我的总结历史（存在数据库里，关机也在）</h2>
      {history.length === 0 && <p>还没有记录，先总结一次吧 👆</p>}
      <ul style={{ paddingLeft: 20 }}>
        {history.map((h) => (
          <li key={h.id} style={{ marginBottom: 12 }}>
            <strong>{h.title}</strong>
            <span style={{ color: '#999', marginLeft: 8, fontSize: 13 }}>{h.createdAt}</span>
            <div style={{ color: '#666', fontSize: 14, marginTop: 2 }}>
              {(h.points || []).join(' · ')}
            </div>
            <div style={{ color: '#4a90d9', fontSize: 13 }}>
              {(h.tags || []).map((t) => `#${t}`).join(' ')}
            </div>
          </li>
        ))}
      </ul>

      <hr />

      <h2>我的学习进度</h2>
      <ul>
        {lessons.map((lesson) => (
          <li key={lesson}>{lesson}</li>
        ))}
      </ul>

      <p>
        我在 <strong>{city}</strong>，正在为实现"个人 AI 应用创业"打基础。
      </p>

      <hr />

      <h2>问问 AI（走我自己的后端）</h2>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="输入你的问题，比如：什么是 async？"
      />
      <button onClick={askAI} disabled={askLoading}>
        {askLoading ? '思考中…' : '提问'}
      </button>
      <p>{answer}</p>

      <hr />

      <h2>计数器练习</h2>
      <button onClick={() => setCount(count + 1)}>点了 {count} 次</button>
      <button onClick={() => setCount(0)}>归零</button>

      <hr />

      <h2>调接口练习</h2>
      <p>{quote}</p>
      <button onClick={fetchQuote}>来一句话</button>
    </div>
  )
}

export default App
