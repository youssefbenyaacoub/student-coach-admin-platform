import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches
        }
        return false
    })

    useEffect(() => {
        const media = window.matchMedia(query)



        const listener = () => setMatches(media.matches)
        media.addEventListener('change', listener)

        return () => media.removeEventListener('change', listener)
    }, [matches, query])

    return matches
}

// Predefined breakpoints
export function useBreakpoint() {
    const isMobile = useMediaQuery('(max-width: 640px)')
    const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)')
    const isDesktop = useMediaQuery('(min-width: 1025px)')

    return {
        isMobile,
        isTablet,
        isDesktop,
        breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
    }
}
