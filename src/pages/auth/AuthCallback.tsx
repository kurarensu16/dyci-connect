import React from 'react'
import { Link } from 'react-router-dom'

const AuthCallback: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl px-6 py-8 text-center space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">
          Email confirmed
        </h1>
        <p className="text-sm text-slate-600">
          Your email address has been verified. You can now sign in with your account credentials.
        </p>
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA]"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AuthCallback

