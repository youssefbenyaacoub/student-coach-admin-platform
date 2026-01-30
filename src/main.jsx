import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DataProvider } from './context/DataContextSupabase.jsx'
import { ProgramManagementProvider } from './context/ProgramManagementContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { CalendarProvider } from './context/CalendarContext.jsx'
import Toasts from './components/common/Toasts.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <ToastProvider>
          <DataProvider>
            <AuthProvider>
              <ProgramManagementProvider>
                <CalendarProvider>
                  <App />
                  <Toasts />
                </CalendarProvider>
              </ProgramManagementProvider>
            </AuthProvider>
          </DataProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
