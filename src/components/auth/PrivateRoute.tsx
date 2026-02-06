import React from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles: string[]
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth()

  if (!user) {
    toast.error('Please login to access this page')
    return <Navigate to="/login" />
  }

  const userRole = user.user_metadata?.role
  if (!allowedRoles.includes(userRole)) {
    toast.error('You do not have permission to access this page')
    return <Navigate to="/" />
  }

  return <>{children}</>
}

export default PrivateRoute