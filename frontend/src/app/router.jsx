import { createBrowserRouter } from 'react-router-dom'
import DriverPage from '../pages/driver.jsx'
import OwnerPage from '../pages/owner.jsx'
import SharedPage from '../pages/shared.jsx'
import LoginPage from '../pages/login.jsx'
import RegisterPage from '../pages/register.jsx'
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx'

export const router = createBrowserRouter([
    { path: '/', element: <SharedPage /> },
    { path: '/driver', element: <DriverPage /> },
    { path: '/owner', element: <OwnerPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
])
