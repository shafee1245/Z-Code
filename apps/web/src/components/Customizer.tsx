'use client'

import { useState, useEffect } from 'react'
import { Palette, Square, Circle, Download, Link, Sparkles } from 'lucide-react'

interface CustomizerProps {
  onUpdate: (config: {
    targetUrl: string
    fillColor: string
    backColor: string
    roundedModules: boolean
  }) => void
  onDownload: () => void
  isGenerating?: boolean
}

export default function Customizer({ onUpdate, onDownload, isGenerating }: CustomizerProps) {
  const [targetUrl, setTargetUrl] = useState('https://example.com')
  const [fillColor, setFillColor] = useState('#123b32')
  const [backColor, setBackColor] = useState('#ffffff')
  const [roundedModules, setRoundedModules] = useState(false)

  useEffect(() => {
    onUpdate({
      targetUrl,
      fillColor,
      backColor,
      roundedModules
    })
  }, [targetUrl, fillColor, backColor, roundedModules, onUpdate])

  const presetColors = [
    { name: 'Forest', dark: '#123b32', light: '#ffffff' },
    { name: 'Ocean', dark: '#1e40af', light: '#ffffff' },
    { name: 'Sunset', dark: '#dc2626', light: '#ffffff' },
    { name: 'Purple', dark: '#7c3aed', light: '#ffffff' },
    { name: 'Black', dark: '#111827', light: '#ffffff' },
    { name: 'Neon', dark: '#22d3ee', light: '#0f172a' }
  ]

  const applyPreset = (dark: string, light: string) => {
    setFillColor(dark)
    setBackColor(light)
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Sparkles className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">QR Customizer</h2>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
          <Link className="w-4 h-4" />
          <span>Target URL</span>
        </label>
        <input
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://yourwebsite.com"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Color Customization */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
          <Palette className="w-4 h-4" />
          <span>Colors</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Foreground</label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="h-12 w-12 border border-gray-200 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500">Background</label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={backColor}
                onChange={(e) => setBackColor(e.target.value)}
                className="h-12 w-12 border border-gray-200 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={backColor}
                onChange={(e) => setBackColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Preset Colors */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500">Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {presetColors.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.dark, preset.light)}
                className="flex flex-col items-center p-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex w-8 h-8 rounded overflow-hidden border border-gray-300">
                  <div className="w-1/2" style={{ backgroundColor: preset.dark }} />
                  <div className="w-1/2" style={{ backgroundColor: preset.light }} />
                </div>
                <span className="text-xs mt-1 text-gray-600">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shape Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Style</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setRoundedModules(false)}
            className={`flex items-center justify-center space-x-2 p-3 border rounded-xl transition-all ${
              !roundedModules
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Square className="w-4 h-4" />
            <span className="text-sm font-medium">Square</span>
          </button>
          <button
            onClick={() => setRoundedModules(true)}
            className={`flex items-center justify-center space-x-2 p-3 border rounded-xl transition-all ${
              roundedModules
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Circle className="w-4 h-4" />
            <span className="text-sm font-medium">Rounded</span>
          </button>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={onDownload}
        disabled={isGenerating}
        className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-5 h-5" />
        <span>{isGenerating ? 'Generating...' : 'Download PNG'}</span>
      </button>
    </div>
  )
}
