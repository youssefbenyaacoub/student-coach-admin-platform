let sharedAudioContext = null

const getAudioContext = () => {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!sharedAudioContext) sharedAudioContext = new Ctor()
  return sharedAudioContext
}

export const primeAudioOnFirstUserGesture = () => {
  if (typeof window === 'undefined') return

  const ctx = getAudioContext()
  if (!ctx) return

  const prime = async () => {
    try {
      if (ctx.state === 'suspended') await ctx.resume()
    } catch {
      // ignored
    } finally {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('keydown', prime)
    }
  }

  window.addEventListener('pointerdown', prime, { once: true })
  window.addEventListener('keydown', prime, { once: true })
}

export const playMessageSound = async () => {
  const ctx = getAudioContext()
  if (!ctx) return false

  try {
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume()
        } catch (e) {
            console.warn('AudioContext resume failed in playMessageSound:', e)
        }
    }

    const now = ctx.currentTime

    // "Messenger"-style Ding: High-pitched, clean bell sound
    const t = ctx.currentTime
    
    // Main tone (Fundamental)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(1200, t) // High C/D range
    
    gain1.gain.setValueAtTime(0, t)
    gain1.gain.linearRampToValueAtTime(0.15, t + 0.01) // Quick attack
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.6) // Long clean decay

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    
    osc1.start(t)
    osc1.stop(t + 0.6)

    // Overtone (Harmonic for "bell" quality)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(2400, t) // 2nd harmonic
    
    gain2.gain.setValueAtTime(0, t)
    gain2.gain.linearRampToValueAtTime(0.05, t + 0.01)
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3) // Shorter decay on harmonic

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    
    osc2.start(t)
    osc2.stop(t + 0.3)

    return true
  } catch {
    return false
  }
}
