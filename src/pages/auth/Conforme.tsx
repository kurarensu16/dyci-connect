import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import logo from '../../assets/imgs/logo-connect.png'

const Conforme: React.FC = () => {
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)

  const handleAgree = () => {
    // Later, you can record this consent server-side.
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex w-full flex-col lg:flex-row">
        {/* Left column: card with conforme text */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 lg:py-12">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl px-6 sm:px-8 py-6 sm:py-8">
            {/* Back button */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-3 inline-flex items-center text-xs text-gray-500 hover:text-blue-600"
            >
              <FaArrowLeft className="mr-1 h-3 w-3" />
              Back
            </button>

            <h1 className="text-sm font-semibold tracking-[0.16em] text-blue-900">
              DYCI CONNECT
            </h1>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">
              User Conforme & Data Privacy Agreement
            </h2>

            <div className="mt-4 space-y-4 max-h-[320px] overflow-y-auto pr-1 text-xs text-gray-700">
              <section>
                <h3 className="font-semibold text-gray-900">
                  1. Declaration of Identity and Authority
                </h3>
                <p className="mt-1 leading-relaxed">
                  I hereby certify that I am a bona fide student or employee of Dr. Yanga&apos;s Colleges, Inc.
                  (DYCI). I declare that the information provided during this registration—including my Full Name,
                  Student/Employee ID, and assigned Academic Department—is true, accurate, and current. I understand
                  that any misrepresentation of my identity may be grounds for disciplinary action under the Student
                  Handbook.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900">
                  2. Data Privacy Consent (RA 10173)
                </h3>
                <p className="mt-1 leading-relaxed">
                  In compliance with the Data Privacy Act of 2012 (Republic Act No. 10173) of the Philippines, I
                  voluntarily grant DYCI Connect permission to collect and process my personal data.
                </p>
                <p className="mt-1 leading-relaxed">
                  <span className="font-semibold">Purpose:</span> My data (including my address and school-role info)
                  will be used solely for academic purposes, account authentication, and school-related communications.
                </p>
                <p className="mt-1 leading-relaxed">
                  <span className="font-semibold">Storage:</span> I understand my profile information, including my
                  Profile Picture and Nickname, will be stored securely within the DYCI Connect database.
                </p>
                <p className="mt-1 leading-relaxed">
                  <span className="font-semibold">Access:</span> I acknowledge my right to access, verify, and request
                  corrections to my data if inaccuracies are found in my profile.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900">
                  3. Acceptable Use & Account Security
                </h3>
                <p className="mt-1 leading-relaxed">
                  <span className="font-semibold">Account Responsibility:</span> I am solely responsible for
                  maintaining the confidentiality of my password. I agree not to share my login credentials with any
                  other individual.
                </p>
                <p className="mt-1 leading-relaxed">
                  <span className="font-semibold">Prohibited Acts:</span> I will not attempt to disrupt the
                  platform&apos;s services, bypass security protocols, or use the system for any purpose that violates
                  school policies.
                </p>
                <p className="mt-1 leading-relaxed">
                  <span className="font-semibold">Content Standards:</span> I agree to use an appropriate Profile
                  Picture and Nickname that reflect the professional and academic standards of the institution.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900">
                  4. Acceptance of Terms
                </h3>
                <p className="mt-1 leading-relaxed">
                  By clicking &quot;I Agree&quot; or &quot;Create Account,&quot; I acknowledge that I have read,
                  understood, and agreed to be bound by the terms of this Conforme and the existing policies of Dr.
                  Yanga&apos;s Colleges, Inc.
                </p>
              </section>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-start space-x-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  I confirm that I have read and understood the DYCI Connect User Conforme &amp; Data Privacy
                  Agreement, and I agree to be bound by its terms.
                </span>
              </label>

              <button
                type="button"
                disabled={!agreed}
                onClick={handleAgree}
                className="w-full inline-flex justify-center rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold py-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                I Agree &amp; Continue
              </button>
            </div>
          </div>
        </div>

        {/* Right column: brand panel */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-[#1434A4] items-center justify-center">
          <div className="text-center px-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img
                src={logo}
                alt="DYCI Connect logo"
                className="h-32 w-32 object-contain rounded-full border-4 border-white shadow-xl"
              />
            </div>
            <h1 className="text-sm font-semibold tracking-[0.2em] text-blue-100">
              DYCI CONNECT
            </h1>
            <p className="mt-2 text-sm text-blue-100">
              User conforme &amp; data privacy agreement
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Conforme

