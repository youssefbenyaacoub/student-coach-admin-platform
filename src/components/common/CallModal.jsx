import React from 'react'
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'
import Modal from './Modal'

export default function CallModal({
  open,
  status,
  direction,
  callType,
  peerName,
  error,
  muted,
  cameraOff,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
}) {
  if (!open) return null

  const title =
    status === 'incoming'
      ? `Incoming ${callType === 'video' ? 'video' : 'audio'} call`
      : status === 'in-call'
        ? `${callType === 'video' ? 'Video' : 'Audio'} call`
        : 'Calling…'

  const showAcceptReject = status === 'incoming'
  const showInCallControls = status === 'in-call' || status === 'connecting' || status === 'outgoing'
  const showVideo = callType === 'video'

  return (
    <Modal isOpen={open} onClose={onEnd} title={title} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <div className="font-medium text-gray-900 dark:text-gray-100">{peerName ?? 'User'}</div>
          <div className="mt-1">
            {direction === 'incoming' ? 'They are calling you.' : 'Ringing…'}
          </div>
          {error ? (
            <div className="mt-2 text-red-600 dark:text-red-400">{String(error)}</div>
          ) : null}
        </div>

        {showVideo ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-black/90 aspect-video overflow-hidden">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
            </div>
            <div className="rounded-lg bg-black/90 aspect-video overflow-hidden">
              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-700 dark:text-gray-200">
            Audio call
            <audio ref={remoteAudioRef} autoPlay />
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          {showAcceptReject ? (
            <>
              <button
                onClick={onReject}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                Decline
              </button>
              <button
                onClick={onAccept}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Accept
              </button>
            </>
          ) : null}

          {showInCallControls ? (
            <>
              <button
                onClick={onToggleMute}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {showVideo ? (
                <button
                  onClick={onToggleCamera}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                  title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </button>
              ) : null}

              <button
                onClick={onEnd}
                className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                title="End call"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Note: Calls require working Supabase Realtime auth; if you still see 401s, signaling will not connect.
        </div>
      </div>
    </Modal>
  )
}
