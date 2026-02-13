import React, { useEffect } from 'react'
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

  const userRole = user?.user_metadata?.role as string | undefined
  const isAllowed = !!user && !!userRole && allowedRoles.includes(userRole)

  // Show toasts as a side-effect, not during render, to avoid React warnings
  useEffect(() => {
    if (!user) {
      toast.error('Please login to access this page')
    } else if (!userRole || !allowedRoles.includes(userRole)) {
      toast.error('You do not have permission to access this page')
    }
  }, [user, userRole, allowedRoles])

  if (!user) {
    return <Navigate to="/login" />
  }

  if (!isAllowed) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}

export default PrivateRoute