import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import App from './App'
import { AuthContext } from './context/AuthContextBase'

// Mock hooks
vi.mock('./hooks/useData', () => ({
  useData: () => ({
    listUsers: () => [],
    hydrated: true,
    getUserById: () => ({ name: 'Test User' })
  })
}))

vi.mock('./hooks/useToast', () => ({
  useToast: () => ({
    push: vi.fn()
  })
}))

// Mock the AuthContext
const MockAuthProvider = ({ children, isAuthenticated, role }) => (
  <AuthContext.Provider value={{ isAuthenticated, role, login: () => {}, logout: () => {} }}>
    {children}
  </AuthContext.Provider>
)

describe('App Routing', () => {
  it('redirects to login when not authenticated', () => {
    render(
      <MockAuthProvider isAuthenticated={false} role={null}>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </MockAuthProvider>
    )
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})
