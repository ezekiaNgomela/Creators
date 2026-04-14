import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return React.createElement('div', { style: { fontFamily: 'sans-serif', padding: '24px' } }, [
    React.createElement('h1', { key: 'title' }, 'Creators'),
    React.createElement('p', { key: 'body' }, 'Web app scaffold is ready.')
  ])
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  React.createElement(React.StrictMode, null, React.createElement(App))
)
