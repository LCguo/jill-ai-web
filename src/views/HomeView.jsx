import { Link } from 'react-router-dom'

const cards = [
  { to: '/assistant', title: 'AI 助手', desc: '双模式对话（闲聊 / 知识库检索），支持流式输出与引用溯源' },
  { to: '/qa', title: '知识库问答', desc: '直接 RAG 问答，单轮，带证据等级与引用' },
  { to: '/documents', title: '文档管理', desc: '上传、预览、删除文档，查看解析状态' },
]

export default function HomeView() {
  return (
    <div className="home">
      <h1 className="home-title">业务助手</h1>
      <div className="home-cards">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="home-card">
            <div className="home-card-title">{c.title}</div>
            <div className="home-card-desc">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
