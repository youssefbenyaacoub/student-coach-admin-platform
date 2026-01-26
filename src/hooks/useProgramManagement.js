import { useContext } from 'react'
import { ProgramManagementContext } from '../context/ProgramManagementContextBase'

export const useProgramManagement = () => {
  const ctx = useContext(ProgramManagementContext)
  if (!ctx) throw new Error('useProgramManagement must be used within ProgramManagementProvider')
  return ctx
}
