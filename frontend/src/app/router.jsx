import { createBrowserRouter } from 'react-router-dom'
import DriverPage from '../pages/driver.jsx'
import OwnerPage from '../pages/owner.jsx'
import SharedPage from '../pages/shared.jsx'
import LoginPage from '../pages/login.jsx'
import RegisterPage from '../pages/register.jsx'
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx'
import CreateParkingPage from '../pages/CreateParkingPage.jsx'

export const router = createBrowserRouter([
    { path: '/', element: <LoginPage /> },          // 👈 landing = login
    { path: '/dashboard', element: <DriverPage /> }, // 👈 dashboard moved here
    { path: '/driver', element: <DriverPage /> },
    { path: '/owner', element: <OwnerPage /> },
    { path: '/create-parking', element: <CreateParkingPage /> },
    { path: '/login', element: <LoginPage /> },      // keep for convenience
    { path: '/register', element: <RegisterPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
])
