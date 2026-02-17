import React, { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import ProfileGuard from './ProfileGuard'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles: string[]
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      toast.error('Please login to access this page')
    }
  }, [user])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <ProfileGuard allowedRoles={allowedRoles}>
      {children}
    </ProfileGuard>
  )
}

export default PrivateRoute