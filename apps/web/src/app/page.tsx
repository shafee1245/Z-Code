'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import QRCodeCanvas from '@/components/QRCodeCanvas'
import Customizer from '@/components/Customizer'
import AnalyticsCharts from '@/components/AnalyticsCharts'
import { QrCode, BarChart3, Download, Share2, Zap } from 'lucide-react'
import LogoutButton from './logout-button'

interface QRConfig {
  targetUrl: string
  fillColor: string
  backColor: string
  roundedModules: boolean
}

export default function DashboardPage() {
  const [config, setConfig] = useState<QRConfig>({
    targetUrl: 'https://example.com',
    fillColor: '#123b32',
    backColor: '#ffffff',
    roundedModules: false
  })
  const [generatedSlug, setGeneratedSlug] = useState<string | null>(null)
  const [generatedShortUrl, setGeneratedShortUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'customizer' | 'analytics'>('customizer')

  const handleConfigUpdate = useCallback((newConfig: QRConfig) => {
    setConfig(newConfig)
  }, [])

  const handleGenerateAndDownload = async () => {
    setIsGenerating(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target_url: config.targetUrl,
          fill_color: config.fillColor,
          back_color: config.backColor,
          rounded_modules: config.roundedModules,
          center_logo_overlay: false,
          title: 'My QR Code'
        })
      })

      if (!response.ok) throw new Error('Failed to generate QR code')

      const data = await response.json()
      setGeneratedSlug(data.short_slug)
      setGeneratedShortUrl(data.short_url)

      // Download the image
      const link = document.createElement('a')
      link.href = `data:image/png;base64,${data.qr_code_image}`
      link.download = `qr-code-${data.short_slug}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('Failed to generate QR code. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShare = () => {
    if (generatedShortUrl) {
      navigator.clipboard.writeText(generatedShortUrl)
      alert('Short URL copied to clipboard!')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Z-Code
                </h1>
                <p className="text-sm text-gray-500">Enterprise QR Code Generator</p>
              </div>
            </div>

            {generatedShortUrl && (
              <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">QR Generated!</span>
                <button
                  onClick={handleShare}
                  className="ml-2 p-1 hover:bg-green-100 rounded-full transition-colors"
                  title="Copy short URL"
                >
                  <Share2 className="w-4 h-4 text-green-600" />
                </button>
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Create Beautiful QR Codes
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Instantly</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate dynamic, trackable QR codes with custom branding, colors, and real-time analytics
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 shadow-lg border border-gray-200">
            <button
              onClick={() => setActiveTab('customizer')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-full transition-all ${
                activeTab === 'customizer'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span className="font-medium">Customizer</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-full transition-all ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Analytics</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'customizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Customizer Panel */}
            <Customizer
              onUpdate={handleConfigUpdate}
              onDownload={handleGenerateAndDownload}
              isGenerating={isGenerating}
            />

            {/* Live Preview */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <QrCode className="w-5 h-5" />
                  <span>Live Preview</span>
                </h3>
                <div className="flex flex-col items-center space-y-6">
                  <QRCodeCanvas
                    value={config.targetUrl}
                    fillColor={config.fillColor}
                    backColor={config.backColor}
                    size={320}
                  />
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-500">Preview updates in real-time</p>
                    {generatedShortUrl && (
                      <div className="bg-gray-50 px-4 py-2 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Dynamic Short Link:</p>
                        <a
                          href={generatedShortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 font-mono break-all"
                        >
                          {generatedShortUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                  <div className="text-blue-600 mb-2">
                    <Download className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">High Resolution</h4>
                  <p className="text-xs text-gray-500 mt-1">Crystal clear PNG export</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                  <div className="text-purple-600 mb-2">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Trackable Links</h4>
                  <p className="text-xs text-gray-500 mt-1">Dynamic short links with analytics</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                  <div className="text-green-600 mb-2">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Instant Redirect</h4>
                  <p className="text-xs text-gray-500 mt-1">Lightning fast 302 redirects</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsCharts slug={generatedSlug} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            © 2026 Z-Code. Built with Next.js, FastAPI & Supabase.
          </div>
        </div>
      </footer>
    </div>
  )
}
