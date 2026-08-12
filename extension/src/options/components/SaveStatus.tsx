export type SaveStatusValue = 'idle' | 'saved' | 'testing' | 'error'

interface SaveStatusProps {
  status: SaveStatusValue
  message?: string
}

function SaveStatus({ status, message }: SaveStatusProps) {
  if (status === 'idle' && !message) {
    return null
  }

  return (
    <p className={`save-status save-status-${status}`}>
      {message ??
        (status === 'saved' ? 'Settings saved.' : 'Unable to save settings.')}
    </p>
  )
}

export default SaveStatus
