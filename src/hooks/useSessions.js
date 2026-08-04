import { useSessionContext } from '../stores/SessionContext.jsx'

export function useSessions() {
  return useSessionContext()
}
