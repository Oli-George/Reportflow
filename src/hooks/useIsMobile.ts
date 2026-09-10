import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < breakpoint
    }
    return false
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    update()

    if (mql.addEventListener) {
      mql.addEventListener("change", update)
    } else {
      mql.addListener(update)
    }

    window.addEventListener("resize", update)

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", update)
      } else {
        mql.removeListener(update)
      }
      window.removeEventListener("resize", update)
    }
  }, [breakpoint])

  return isMobile
}
