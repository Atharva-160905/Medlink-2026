import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/**
 * SmoothScroll component powered by Lenis
 * Provides silky smooth scrolling throughout the entire MedLink application,
 * automatically scrolls to top on route navigation, and respects nested
 * scroll containers marked with [data-lenis-prevent].
 */
export default function SmoothScroll({ children }) {
  const lenisRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.2,
      autoRaf: true,
      anchors: true,
      prevent: (node) => {
        return (
          node?.hasAttribute?.('data-lenis-prevent') ||
          node?.closest?.('[data-lenis-prevent]') !== null
        )
      },
    })

    lenisRef.current = lenis
    window.__lenis = lenis

    return () => {
      lenis.destroy()
      window.__lenis = null
      lenisRef.current = null
    }
  }, [])

  // Scroll to top immediately on page change
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true })
    }
  }, [location.pathname])

  return children
}

