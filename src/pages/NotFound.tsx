import React from 'react'
import { Link } from 'react-router-dom'

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl px-6 py-10 text-center space-y-6">
        <p className="text-6xl font-bold text-slate-200 tracking-tight">404</p>
        <h1 className="text-lg font-semibold text-slate-900">NOT FOUND</h1>
        <p className="text-sm text-slate-600">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA]"
          >
            Go to home
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
