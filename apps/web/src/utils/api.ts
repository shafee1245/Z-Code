export function getApiBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return ''
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}
