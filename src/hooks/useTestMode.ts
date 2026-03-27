import { useState, useEffect, useRef, useCallback } from 'react'
import type { Violation, ViolationType } from '../types'

interface UseTestModeOptions {
  enabled: boolean
}

export function useTestMode({ enabled }: UseTestModeOptions) {
  const [violations, setViolations] = useState<Violation[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const hiddenSince = useRef<number | null>(null)
  const blurSince = useRef<number | null>(null)
  const initialSize = useRef<{ w: number; h: number } | null>(null)

  const addViolation = useCallback((type: ViolationType, duration_ms?: number) => {
    const v: Violation = { type, timestamp: new Date().toISOString() }
    if (duration_ms !== undefined) v.duration_ms = duration_ms
    setViolations((prev) => [...prev, v])
    setShowWarning(true)
    setTimeout(() => setShowWarning(false), 3000)
  }, [])

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen may not be available
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    initialSize.current = { w: window.innerWidth, h: window.innerHeight }

    function onVisibilityChange() {
      if (document.hidden) {
        hiddenSince.current = Date.now()
      } else if (hiddenSince.current) {
        addViolation('tab_hidden', Date.now() - hiddenSince.current)
        hiddenSince.current = null
      }
    }

    function onFullscreenChange() {
      const fs = !!document.fullscreenElement
      setIsFullscreen(fs)
      if (!fs) {
        addViolation('fullscreen_exit')
      }
    }

    function onBlur() {
      blurSince.current = Date.now()
    }

    function onFocus() {
      if (blurSince.current) {
        addViolation('focus_lost', Date.now() - blurSince.current)
        blurSince.current = null
      }
    }

    function onResize() {
      if (!initialSize.current) return
      const { w, h } = initialSize.current
      const currentArea = window.innerWidth * window.innerHeight
      const initialArea = w * h
      if (currentArea < initialArea * 0.8) {
        addViolation('resize')
      }
    }

    function onCopyPaste(e: Event) {
      e.preventDefault()
      addViolation('copy_paste')
    }

    function onContextMenu(e: Event) {
      e.preventDefault()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    window.addEventListener('resize', onResize)
    document.addEventListener('copy', onCopyPaste)
    document.addEventListener('paste', onCopyPaste)
    document.addEventListener('contextmenu', onContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('copy', onCopyPaste)
      document.removeEventListener('paste', onCopyPaste)
      document.removeEventListener('contextmenu', onContextMenu)
    }
  }, [enabled, addViolation])

  return { violations, enterFullscreen, isFullscreen, showWarning }
}
