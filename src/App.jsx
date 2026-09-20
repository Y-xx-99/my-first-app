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

function App() {
  const name = '六金'
  const city = '杭州'
  const lessons = [
    '第 1 阶段：Node 脚本 ✅',
    '第 2 阶段：网页（React 进行中）',
    '第 3 阶段：接入大模型 API ✅ 结构化输出 ✅ 数据库 ✅',
    '第 4 阶段：迈向第一步',
  ]

  // ---- 长文总结 ----
  const [article, setArticle] = useState('')
  const [result, setResult] = useState(null)
  const [sumLoading, setSumLoading] = useState(false)

  // ---- 历史记录（存在数据库里）----
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

  // ★ 页面第一次打开时，自动去后端拉一次历史记录（依赖数组是 [] → 只执行一次）
  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    const res = await fetch(`${API_BASE}/api/history`)
    const data = await res.json()
    setHistory(data.history || [])
  }

  async function summarize() {
    setSumLoading(true)
    setResult(null)
    const res = await fetch(`${API_BASE}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: article }),
    })
    const data = await res.json()
    setResult(data)
    setSumLoading(false)
    loadHistory() // 存进数据库了，顺便刷新历史列表
  }

  // ★ 待办助手：一句话交给后端，模型自己决定调不调工具
  async function askAgent() {
    if (todoInput.trim() === '') return
    setTodoLoading(true)
    setTodoReply('思考中…')
    const res = await fetch(`${API_BASE}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: todoInput }),
    })
    const data = await res.json()
    setTodoReply(data.reply)
    setTodos(data.todos || [])
    setTodoInput('')
    setTodoLoading(false)
  }

  async function askAI() {
    setAskLoading(true)
    setAnswer('思考中…')
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    const data = await res.json()
    setAnswer(data.answer)
    setAskLoading(false)
  }

  async function fetchQuote() {
    const res = await fetch('https://v1.hitokoto.cn/')
    const data = await res.json()
    setQuote(data.hitokoto + ' —— ' + data.from)
  }

  return (
    <div>
      <h1>你好，我是 {name}</h1>
      <p>我在学习 AI 应用开发——下面是我做的第一批 AI 小工具 👇</p>

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

      <h3>🗒️ 待办清单（数据库里的）</h3>
      {todos.length === 0 && <p style={{ color: '#888' }}>还没有待办</p>}
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {t.done ? '✅' : '⬜'} {t.text}
            <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
              {t.created_at}
            </span>
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
        <div
          style={{
            marginTop: 14,
            padding: 16,
            background: '#f7f7f8',
            borderRadius: 10,
          }}
        >
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

      <h2>📚 总结历史（存在数据库里，关机也在）</h2>
      {history.length === 0 && <p>还没有记录，先总结一次吧 👆</p>}
      <ul style={{ paddingLeft: 20 }}>
        {history.map((h) => (
          <li key={h.id} style={{ marginBottom: 12 }}>
            <strong>{h.title}</strong>
            <span style={{ color: '#999', marginLeft: 8, fontSize: 13 }}>
              {h.createdAt}
            </span>
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

      <p>我在 <strong>{city}</strong>，正在为实现"个人 AI 应用创业"打基础。</p>

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
