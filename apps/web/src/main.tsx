import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return (
    <main style={{ fontFamily: 'Inter, sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Creators</h1>
      <p>A modern creator platform starter with auth, subscriptions, coins, and paid streams.</p>
      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <article style={{ padding: 16, border: '1px solid #ddd', borderRadius: 16 }}>
          <h2>Creators</h2>
          <p>Create channels, paid posts, paid streams, and promotions.</p>
        </article>
        <article style={{ padding: 16, border: '1px solid #ddd', borderRadius: 16 }}>
          <h2>Subscribers</h2>
          <p>Subscribe to channels, buy coins, and pay to join streams.</p>
        </article>
        <article style={{ padding: 16, border: '1px solid #ddd', borderRadius: 16 }}>
          <h2>Payments</h2>
          <p>10 coins = 1 USD. Default split is 80/10/10.</p>
        </article>
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
