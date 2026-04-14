const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export async function healthcheck() {
  const res = await fetch(`${API_BASE_URL}/health`)
  if (!res.ok) {
    throw new Error('healthcheck failed')
  }
  return res.json()
}
