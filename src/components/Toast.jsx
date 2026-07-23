import { useStore } from '../store/useStore'

export function Toast() {
  const toast = useStore((state) => state.toast)

  if (!toast) return null

  const isError = toast.type === 'error'

  return (
    <div className={`toast ${isError ? 'toast-error' : 'toast-success'}`}>
      {isError ? '⚠️ ' : '✓ '}
      {toast.message}
    </div>
  )
}
