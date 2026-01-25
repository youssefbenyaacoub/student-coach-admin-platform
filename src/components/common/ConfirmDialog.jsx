import Modal from './Modal'

export default function ConfirmDialog({
  open,
  isOpen,
  title = 'Confirm',
  message,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  isDanger,
  onConfirm,
  onClose,
  busy,
  isLoading,
}) {
  const visible = open ?? isOpen ?? false
  const body = message ?? description
  const isBusy = busy ?? isLoading
  const isDangerous = danger ?? isDanger

  return (
    <Modal
      open={visible}
      title={title}
      onClose={isBusy ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={isBusy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDangerous ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-slate-700">{body}</div>
    </Modal>
  )
}
