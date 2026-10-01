import { useState } from 'react'

export default function AuthModal({
  isOpen,
  onClose,
  theme = 'light',
  apiBaseUrl,
  onLoginSuccess,
}) {
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register' | 'verify-otp' | 'forgot-password'
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Register state
  const [fullName, setFullName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [nicNumber, setNicNumber] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showRegisterPw, setShowRegisterPw] = useState(false)

  // OTP state
  const [otpPendingEmail, setOtpPendingEmail] = useState('')
  const [otpValue, setOtpValue] = useState('')

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotNewPw, setForgotNewPw] = useState('')
  const [forgotConfirmPw, setForgotConfirmPw] = useState('')
  const [forgotStep, setForgotStep] = useState(1) // 1 = request OTP, 2 = enter OTP & new PW
  const [showForgotPw, setShowForgotPw] = useState(false)

  if (!isOpen) return null

  const handleLoginSubmit = async (e) => {
    e?.preventDefault()
    setFeedback({ type: '', text: '' })

    if (!email.trim() || !password) {
      setFeedback({ type: 'error', text: 'Please enter both your email and password.' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/Auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!response.ok) {
        setFeedback({ type: 'error', text: 'Invalid email or password. Please verify credentials or register.' })
        setLoading(false)
        return
      }

      const result = await response.json()
      onLoginSuccess(result)
    } catch {
      setFeedback({ type: 'error', text: 'API unavailable. Please ensure the backend is running on port 5187.' })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e?.preventDefault()
    setFeedback({ type: '', text: '' })

    if (!fullName.trim() || !registerEmail.trim() || !contactNumber.trim() || !nicNumber.trim() || !registerPassword) {
      setFeedback({ type: 'error', text: 'Please complete all required fields.' })
      return
    }

    if (!/^\d{10}$/.test(contactNumber.trim())) {
      setFeedback({ type: 'error', text: 'Contact number must be exactly 10 digits.' })
      return
    }

    if (!/^(\d{9}[VvXx]|\d{12})$/.test(nicNumber.trim())) {
      setFeedback({ type: 'error', text: 'NIC must be 12 digits or 9 digits followed by V or X.' })
      return
    }

    if (registerPassword.length < 8 || !/[A-Z]/.test(registerPassword) || !/[a-z]/.test(registerPassword) || !/\d/.test(registerPassword) || !/[^A-Za-z0-9]/.test(registerPassword)) {
      setFeedback({ type: 'error', text: 'Password must be 8+ characters and contain uppercase, lowercase, number, and special character.' })
      return
    }

    if (registerPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/Auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: registerEmail.trim(),
          contactNumber: contactNumber.trim(),
          nicNumber: nicNumber.trim(),
          password: registerPassword,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        setFeedback({ type: 'error', text: err || 'Registration failed.' })
        setLoading(false)
        return
      }

      const data = await response.json().catch(() => ({}))
      setOtpPendingEmail(registerEmail.trim().toLowerCase())

      if (data.devOtp) {
        setOtpValue(data.devOtp)
        setFeedback({ type: 'info', text: `Verification code generated: ${data.devOtp} (auto-filled below).` })
      } else {
        setOtpValue('')
        setFeedback({ type: 'success', text: `Verification code sent to ${registerEmail.trim()}. Check your inbox!` })
      }
      setAuthMode('verify-otp')
    } catch {
      setFeedback({ type: 'error', text: 'Unable to reach registration service.' })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtpSubmit = async (e) => {
    e?.preventDefault()
    setFeedback({ type: '', text: '' })

    if (!otpValue.trim() || otpValue.trim().length !== 6) {
      setFeedback({ type: 'error', text: 'Please enter the complete 6-digit verification code.' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/Auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpPendingEmail, otp: otpValue.trim() }),
      })

      if (!response.ok) {
        const err = await response.text()
        setFeedback({ type: 'error', text: err || 'Verification code is invalid or expired.' })
        setLoading(false)
        return
      }

      setEmail(otpPendingEmail)
      setPassword('')
      setFeedback({ type: 'success', text: 'Account verified successfully! Please sign in below.' })
      setAuthMode('login')
    } catch {
      setFeedback({ type: 'error', text: 'Unable to verify code. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordRequest = async (e) => {
    e?.preventDefault()
    setFeedback({ type: '', text: '' })

    if (!forgotEmail.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your registered account email.' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/Auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })

      if (!response.ok) {
        const err = await response.text()
        setFeedback({ type: 'error', text: err || 'Could not send recovery email.' })
        setLoading(false)
        return
      }

      const data = await response.json().catch(() => ({}))
      if (data.devOtp) {
        setForgotOtp(data.devOtp)
        setFeedback({ type: 'info', text: `Recovery code: ${data.devOtp} (auto-filled below).` })
      } else {
        setFeedback({ type: 'success', text: `A 6-digit recovery code was sent to ${forgotEmail.trim()}. Check your inbox!` })
      }
      setForgotStep(2)
    } catch {
      setFeedback({ type: 'error', text: 'Unable to process recovery request.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPasswordSubmit = async (e) => {
    e?.preventDefault()
    setFeedback({ type: '', text: '' })

    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setFeedback({ type: 'error', text: 'Please enter the 6-digit recovery code.' })
      return
    }

    if (forgotNewPw.length < 8 || !/[A-Z]/.test(forgotNewPw) || !/[a-z]/.test(forgotNewPw) || !/\d/.test(forgotNewPw) || !/[^A-Za-z0-9]/.test(forgotNewPw)) {
      setFeedback({ type: 'error', text: 'New password must be 8+ characters and contain uppercase, lowercase, number, and special symbol.' })
      return
    }

    if (forgotNewPw !== forgotConfirmPw) {
      setFeedback({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/Auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPw,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        setFeedback({ type: 'error', text: err || 'Password reset failed. Invalid or expired code.' })
        setLoading(false)
        return
      }

      setEmail(forgotEmail.trim())
      setPassword('')
      setForgotEmail('')
      setForgotOtp('')
      setForgotNewPw('')
      setForgotConfirmPw('')
      setForgotStep(1)
      setFeedback({ type: 'success', text: 'Password reset successful! Sign in with your new password.' })
      setAuthMode('login')
    } catch {
      setFeedback({ type: 'error', text: 'Unable to connect to password reset service.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-backdrop">
      <div className="auth-modal-dialog">
        {/* Top Header with Brand & Close Button */}
        <div className="auth-dialog-header">
          <div className="auth-brand-lockup">
            <img
              src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'}
              alt="MySpot"
              className="auth-brand-logo-img"
            />
            <span className="auth-security-tag">
              <span className="auth-lock-icon">🔒</span> Secure Member Access
            </span>
          </div>

          <button
            type="button"
            className="auth-modal-close-icon-btn"
            onClick={onClose}
            aria-label="Close dialog and continue browsing"
            title="Continue browsing"
          >
            ✕
          </button>
        </div>

        {/* Auth Mode Tabs (Sign In / Register) */}
        {authMode !== 'verify-otp' && authMode !== 'forgot-password' && (
          <div className="auth-tab-switch">
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login')
                setFeedback({ type: '', text: '' })
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register')
                setFeedback({ type: '', text: '' })
              }}
            >
              Register Account
            </button>
          </div>
        )}

        {/* Feedback Alert Banner */}
        {feedback.text && (
          <div className={`auth-alert-banner ${feedback.type}`}>
            <span className="alert-icon">
              {feedback.type === 'error' ? '⚠️' : feedback.type === 'success' ? '✅' : 'ℹ️'}
            </span>
            <span className="alert-text">{feedback.text}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="auth-form-body">
            <div className="auth-form-title-wrap">
              <h2>Welcome Back</h2>
              <p>Sign in to manage court reservations and athlete support.</p>
            </div>

            <div className="auth-field-group">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <span className="input-glyph">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <div className="field-label-split">
                <label>Password</label>
                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={() => {
                    setAuthMode('forgot-password')
                    setForgotStep(1)
                    setForgotEmail(email)
                    setFeedback({ type: '', text: '' })
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="auth-input-wrap">
                <span className="input-glyph">🔑</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-primary-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* 2. REGISTRATION FORM */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="auth-form-body">
            <div className="auth-form-title-wrap">
              <h2>Create Account</h2>
              <p>Join SmartSports for instant bookings and athlete privileges.</p>
            </div>

            <div className="auth-field-group">
              <label>Full Name</label>
              <div className="auth-input-wrap">
                <span className="input-glyph">👤</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aisha Jordan"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <span className="input-glyph">✉️</span>
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="auth-fields-row">
              <div className="auth-field-group">
                <label>Contact Phone</label>
                <div className="auth-input-wrap">
                  <span className="input-glyph">📞</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="0771234567"
                    required
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label>NIC Number</label>
                <div className="auth-input-wrap">
                  <span className="input-glyph">🪪</span>
                  <input
                    type="text"
                    maxLength={12}
                    value={nicNumber}
                    onChange={(e) => setNicNumber(e.target.value.replace(/[^0-9vVxX]/g, '').slice(0, 12))}
                    placeholder="123456789V"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-field-group">
              <label>Password</label>
              <div className="auth-input-wrap">
                <span className="input-glyph">🔑</span>
                <input
                  type={showRegisterPw ? 'text' : 'password'}
                  minLength={8}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="8+ chars (A-Z, a-z, 0-9, symbol)"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowRegisterPw(!showRegisterPw)}
                  aria-label="Toggle password visibility"
                >
                  {showRegisterPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label>Confirm Password</label>
              <div className="auth-input-wrap">
                <span className="input-glyph">🔒</span>
                <input
                  type={showRegisterPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-primary-btn" disabled={loading}>
              {loading ? 'Sending Verification Code...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* 3. VERIFY OTP FORM */}
        {authMode === 'verify-otp' && (
          <form onSubmit={handleVerifyOtpSubmit} className="auth-form-body">
            <div className="auth-form-title-wrap">
              <h2>Verify Your Email</h2>
              <p>Enter the 6-digit code sent to <strong>{otpPendingEmail}</strong>.</p>
            </div>

            <div className="auth-field-group">
              <label style={{ textAlign: 'center' }}>6-Digit Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="auth-otp-input"
                autoFocus
                required
              />
            </div>

            <button type="submit" className="auth-submit-primary-btn" disabled={loading}>
              {loading ? 'Verifying Account...' : 'Verify & Complete Registration'}
            </button>

            <button
              type="button"
              className="auth-link-back-btn"
              onClick={() => {
                setAuthMode('register')
                setFeedback({ type: '', text: '' })
              }}
            >
              ← Back to Registration Details
            </button>
          </form>
        )}

        {/* 4. FORGOT PASSWORD WORKFLOW */}
        {authMode === 'forgot-password' && (
          <div className="auth-form-body">
            <div className="auth-form-title-wrap">
              <h2>Reset Password</h2>
              <p>
                {forgotStep === 1
                  ? 'Enter your registered email and we will send a 6-digit recovery code.'
                  : `Enter the 6-digit recovery code sent to ${forgotEmail} and choose a new password.`}
              </p>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotPasswordRequest}>
                <div className="auth-field-group">
                  <label>Registered Account Email</label>
                  <div className="auth-input-wrap">
                    <span className="input-glyph">✉️</span>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-primary-btn" disabled={loading}>
                  {loading ? 'Sending Recovery Code...' : 'Send Recovery Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit}>
                <div className="auth-field-group">
                  <label style={{ textAlign: 'center' }}>6-Digit Recovery Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="auth-otp-input"
                    autoFocus
                    required
                  />
                </div>

                <div className="auth-field-group">
                  <label>New Password</label>
                  <div className="auth-input-wrap">
                    <span className="input-glyph">🔑</span>
                    <input
                      type={showForgotPw ? 'text' : 'password'}
                      value={forgotNewPw}
                      onChange={(e) => setForgotNewPw(e.target.value)}
                      placeholder="8+ chars, uppercase, lowercase & symbol"
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowForgotPw(!showForgotPw)}
                      aria-label="Toggle password visibility"
                    >
                      {showForgotPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="auth-field-group">
                  <label>Confirm New Password</label>
                  <div className="auth-input-wrap">
                    <span className="input-glyph">🔒</span>
                    <input
                      type={showForgotPw ? 'text' : 'password'}
                      value={forgotConfirmPw}
                      onChange={(e) => setForgotConfirmPw(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-primary-btn" disabled={loading}>
                  {loading ? 'Updating Password...' : 'Reset & Update Password'}
                </button>
              </form>
            )}

            <button
              type="button"
              className="auth-link-back-btn"
              onClick={() => {
                setAuthMode('login')
                setForgotStep(1)
                setFeedback({ type: '', text: '' })
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* Professional Guest Browsing Action */}
        <div className="auth-dialog-footer">
          <button
            type="button"
            className="auth-guest-browse-btn"
            onClick={onClose}
          >
            <span className="browse-arrow">←</span>
            <span>Continue as Guest (Explore Facilities Without Signing In)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
