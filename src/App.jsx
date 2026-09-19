import { useState } from 'react'

function App() {
  const name = '六金'
  const city = '杭州'
  const lessons = [
    '第 1 阶段：Node 脚本 ✅',
    '第 2 阶段：网页（React 进行中）',
    '第 3 阶段：接入大模型 API ✅ 第一个 AI 小工具已跑通',
    '第 4 阶段：迈向第一步',
  ]

  // ---- 长文总结功能 ----
  const [article, setArticle] = useState('')
  const [summary, setSummary] = useState('（还没总结）')
  const [sumLoading, setSumLoading] = useState(false)

  // ---- 问答功能 ----
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('（还没问）')
  const [askLoading, setAskLoading] = useState(false)

  // ---- 小练习（保留）----
  const [count, setCount] = useState(0)
  const [quote, setQuote] = useState('点下面的按钮，获取一句话')

  async function summarize() {
    setSumLoading(true)
    setSummary('总结中…')
    const res = await fetch('http://localhost:3001/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: article }),
    })
    const data = await res.json()
    setSummary(data.summary)
    setSumLoading(false)
  }

  async function askAI() {
    setAskLoading(true)
    setAnswer('思考中…')
    const res = await fetch('http://localhost:3001/api/ask', {
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
      <p>我在学习 AI 应用开发——下面是我做的第一个 AI 小工具 👇</p>

      <hr />

      <h2>📝 AI 长文总结器</h2>
      <p>把你的长文贴进下面，AI 帮你总结成 3 个要点。</p>
      <textarea
        value={article}
        onChange={(e) => setArticle(e.target.value)}
        rows={10}
        placeholder="把你的长文贴到这里……"
      />
      <br />
      <button onClick={summarize} disabled={sumLoading}>
        {sumLoading ? '总结中…' : '总结成要点'}
      </button>
      <pre>{summary}</pre>

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
