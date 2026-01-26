import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
}

export const CallStatus = {
  idle: 'idle',
  incoming: 'incoming',
  outgoing: 'outgoing',
  connecting: 'connecting',
  inCall: 'in-call',
  ended: 'ended',
}

export function useWebRTCCall({ currentUserId, peerId, conversationKey, rtcConfig } = {}) {
  const [status, setStatus] = useState(CallStatus.idle)
  const [callType, setCallType] = useState(null) // 'audio' | 'video'
  const [direction, setDirection] = useState(null) // 'incoming' | 'outgoing'
  const [error, setError] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)

  const statusRef = useRef(CallStatus.idle)

  const channelRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const pendingOfferRef = useRef(null)

  const ready = Boolean(currentUserId && peerId && conversationKey)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const channelName = useMemo(() => {
    if (!conversationKey) return null
    return `call:${conversationKey}`
  }, [conversationKey])

  const cleanupPeer = useCallback(() => {
    try {
      const pc = pcRef.current
      if (pc) {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onconnectionstatechange = null
        pc.oniceconnectionstatechange = null
        try { pc.close() } catch { /* ignore */ }
      }
    } finally {
      pcRef.current = null
    }

    try {
      const ls = localStreamRef.current
      if (ls) {
        ls.getTracks().forEach((t) => {
          try { t.stop() } catch { /* ignore */ }
        })
      }
    } finally {
      localStreamRef.current = null
      setLocalStream(null)
    }

    try {
      const rs = remoteStreamRef.current
      if (rs) {
        rs.getTracks().forEach((t) => {
          try { t.stop() } catch { /* ignore */ }
        })
      }
    } finally {
      remoteStreamRef.current = null
      setRemoteStream(null)
    }

    pendingOfferRef.current = null
    setMuted(false)
    setCameraOff(false)
  }, [])

  const sendSignal = useCallback(async (event, payload) => {
    const ch = channelRef.current
    if (!ch) return
    try {
      await ch.send({
        type: 'broadcast',
        event,
        payload,
      })
    } catch (e) {
      // This can fail if realtime/auth is misconfigured.
      console.warn('Call signal send failed:', event, e)
    }
  }, [])

  const ensureLocalStream = useCallback(async (nextType) => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia is not supported in this browser')
    }

    const constraints = nextType === 'video'
      ? { audio: true, video: { width: 1280, height: 720 } }
      : { audio: true, video: false }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = stream
    setLocalStream(stream)

    const remote = new MediaStream()
    remoteStreamRef.current = remote
    setRemoteStream(remote)

    return { stream, remote }
  }, [])

  const ensurePeerConnection = useCallback(async (nextType) => {
    const cfg = rtcConfig ?? DEFAULT_RTC_CONFIG
    const pc = new RTCPeerConnection(cfg)
    pcRef.current = pc

    pc.onicecandidate = (e) => {
      if (!e.candidate) return
      sendSignal('ice', {
        from: currentUserId,
        to: peerId,
        candidate: e.candidate,
      })
    }

    pc.ontrack = (e) => {
      const remote = remoteStreamRef.current
      if (!remote) return

      // Some browsers provide e.streams; others rely on e.track.
      if (e.track) {
        const existing = remote.getTracks().some((t) => t.id === e.track.id)
        if (!existing) {
          try { remote.addTrack(e.track) } catch { /* ignore */ }
        }
      }

      const stream0 = e.streams?.[0]
      if (stream0?.getTracks) {
        stream0.getTracks().forEach((t) => {
          const existing = remote.getTracks().some((rt) => rt.id === t.id)
          if (existing) return
          try { remote.addTrack(t) } catch { /* ignore */ }
        })
      }

      // Force react state update for media element bindings
      setRemoteStream(new MediaStream(remote.getTracks()))
    }

    const onConnChange = () => {
      const state = pc.connectionState
      if (state === 'connected') {
        setStatus(CallStatus.inCall)
      }
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setStatus(CallStatus.ended)
        cleanupPeer()
      }
    }

    pc.onconnectionstatechange = onConnChange
    pc.oniceconnectionstatechange = onConnChange

    const { stream } = await ensureLocalStream(nextType)
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    return pc
  }, [cleanupPeer, currentUserId, ensureLocalStream, peerId, rtcConfig, sendSignal])

  const startCall = useCallback(async (nextType) => {
    setError(null)
    if (!ready) {
      setError('Call is not ready yet')
      return { success: false, error: 'Call is not ready yet' }
    }

    if (status !== CallStatus.idle && status !== CallStatus.ended) {
      return { success: false, error: 'Already in a call' }
    }

    try {
      setDirection('outgoing')
      setCallType(nextType)
      setStatus(CallStatus.outgoing)

      const pc = await ensurePeerConnection(nextType)
      setStatus(CallStatus.connecting)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await sendSignal('offer', {
        from: currentUserId,
        to: peerId,
        callType: nextType,
        sdp: offer,
      })

      return { success: true }
    } catch (e) {
      console.error('startCall failed:', e)
      setError(e?.message ?? String(e))
      setStatus(CallStatus.ended)
      cleanupPeer()
      return { success: false, error: e }
    }
  }, [cleanupPeer, currentUserId, ensurePeerConnection, peerId, ready, sendSignal, status])

  const acceptCall = useCallback(async () => {
    setError(null)
    if (!ready) return { success: false, error: 'Call is not ready yet' }
    if (status !== CallStatus.incoming) return { success: false, error: 'No incoming call' }

    const offerPayload = pendingOfferRef.current
    if (!offerPayload?.sdp || !offerPayload?.callType) {
      setStatus(CallStatus.ended)
      return { success: false, error: 'Missing offer payload' }
    }

    try {
      setDirection('incoming')
      setCallType(offerPayload.callType)
      setStatus(CallStatus.connecting)

      const pc = await ensurePeerConnection(offerPayload.callType)
      await pc.setRemoteDescription(offerPayload.sdp)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await sendSignal('answer', {
        from: currentUserId,
        to: peerId,
        sdp: answer,
      })

      return { success: true }
    } catch (e) {
      console.error('acceptCall failed:', e)
      setError(e?.message ?? String(e))
      setStatus(CallStatus.ended)
      cleanupPeer()
      return { success: false, error: e }
    }
  }, [cleanupPeer, currentUserId, ensurePeerConnection, peerId, ready, sendSignal, status])

  const rejectCall = useCallback(async () => {
    if (!ready) return
    if (status !== CallStatus.incoming) return
    await sendSignal('reject', { from: currentUserId, to: peerId })
    setStatus(CallStatus.ended)
    cleanupPeer()
  }, [cleanupPeer, currentUserId, peerId, ready, sendSignal, status])

  const endCall = useCallback(async () => {
    if (!ready) return
    if (status === CallStatus.idle) return
    await sendSignal('end', { from: currentUserId, to: peerId })
    setStatus(CallStatus.ended)
    cleanupPeer()
  }, [cleanupPeer, currentUserId, peerId, ready, sendSignal, status])

  const toggleMute = useCallback(() => {
    const ls = localStreamRef.current
    if (!ls) return
    const next = !muted
    ls.getAudioTracks().forEach((t) => { t.enabled = !next })
    setMuted(next)
  }, [muted])

  const toggleCamera = useCallback(() => {
    const ls = localStreamRef.current
    if (!ls) return
    const next = !cameraOff
    ls.getVideoTracks().forEach((t) => { t.enabled = !next })
    setCameraOff(next)
  }, [cameraOff])

  // Setup signaling channel
  useEffect(() => {
    if (!channelName || !currentUserId) return

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'offer' }, (evt) => {
        const payload = evt?.payload
        if (!payload) return
        if (payload.to !== currentUserId) return
        if (payload.from !== peerId) return

        // Busy if already in a call
        if (statusRef.current !== CallStatus.idle && statusRef.current !== CallStatus.ended) {
          sendSignal('busy', { from: currentUserId, to: peerId })
          return
        }

        pendingOfferRef.current = payload
        setDirection('incoming')
        setCallType(payload.callType)
        setStatus(CallStatus.incoming)
      })
      .on('broadcast', { event: 'answer' }, async (evt) => {
        const payload = evt?.payload
        if (!payload) return
        if (payload.to !== currentUserId) return
        if (payload.from !== peerId) return

        try {
          const pc = pcRef.current
          if (!pc) return
          await pc.setRemoteDescription(payload.sdp)
          setStatus(CallStatus.inCall)
        } catch (e) {
          console.warn('Failed to apply answer:', e)
          setError(e?.message ?? String(e))
          setStatus(CallStatus.ended)
          cleanupPeer()
        }
      })
      .on('broadcast', { event: 'ice' }, async (evt) => {
        const payload = evt?.payload
        if (!payload) return
        if (payload.to !== currentUserId) return
        if (payload.from !== peerId) return
        try {
          const pc = pcRef.current
          if (!pc || !payload.candidate) return
          await pc.addIceCandidate(payload.candidate)
        } catch (e) {
          // can happen during teardown
          console.warn('Failed to add ICE candidate:', e)
        }
      })
      .on('broadcast', { event: 'end' }, (evt) => {
        const payload = evt?.payload
        if (!payload) return
        if (payload.to !== currentUserId) return
        if (payload.from !== peerId) return
        setStatus(CallStatus.ended)
        cleanupPeer()
      })
      .on('broadcast', { event: 'reject' }, (evt) => {
        const payload = evt?.payload
        if (!payload) return
        if (payload.to !== currentUserId) return
        if (payload.from !== peerId) return
        setStatus(CallStatus.ended)
        cleanupPeer()
      })
      .on('broadcast', { event: 'busy' }, (evt) => {
        const payload = evt?.payload
        if (!payload) return
        if (payload.to !== currentUserId) return
        if (payload.from !== peerId) return
        setError('User is busy')
        setStatus(CallStatus.ended)
        cleanupPeer()
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Signaling channel error (check Supabase Realtime auth/401):', channelName)
        }
        if (status === 'CLOSED') {
          console.warn('Signaling channel closed:', channelName)
        }
      })

    channelRef.current = channel

    return () => {
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }
      } catch {
        // ignore
      }
    }
  }, [channelName, cleanupPeer, currentUserId, peerId, sendSignal])

  // Reset call state when peer/conversation changes
  useEffect(() => {
    setStatus(CallStatus.idle)
    setCallType(null)
    setDirection(null)
    setError(null)
    cleanupPeer()
  }, [conversationKey, peerId, cleanupPeer])

  return {
    ready,
    status,
    direction,
    callType,
    error,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    startAudioCall: () => startCall('audio'),
    startVideoCall: () => startCall('video'),
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  }
}
