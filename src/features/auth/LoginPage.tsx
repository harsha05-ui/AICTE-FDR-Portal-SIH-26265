import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  UserCheck,
  Shield,
  Building2,
  LogIn,
  MapPin,
  UserPlus,
  Phone,
  FileBadge,
} from 'lucide-react'
import gsap from 'gsap'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/forms/Field'
import {
  loginSchema,
  LoginFormData,
  registerInstitutionSchema,
  RegisterInstitutionFormData,
} from './schemas'
import { useAuth } from './AuthContext'
import { ApiError } from '@/lib/errors'

interface LoginPreset {
  id: string
  name: string
  email: string
  roleLabel: string
  roleBadgeColor: string
  organization: string
}

const LOGIN_PRESETS: LoginPreset[] = [
  {
    id: 'institution',
    name: 'Dr. Rajesh Sharma',
    email: 'principal@iiitm-delhi.ac.in',
    roleLabel: 'Institution Signatory',
    roleBadgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    organization: 'IIITM Delhi',
  },
  {
    id: 'reviewer',
    name: 'Anil Kumar Verma',
    email: 'reviewer@aicte.gov.in',
    roleLabel: 'Review Desk',
    roleBadgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    organization: 'Scrutiny Bureau',
  },
  {
    id: 'approver',
    name: 'Dr. M. S. Radhakrishnan',
    email: 'approver@aicte.gov.in',
    roleLabel: 'Approval Authority',
    roleBadgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    organization: 'Sanction Bureau',
  },
  {
    id: 'admin',
    name: 'S. K. Deshmukh',
    email: 'admin@aicte.gov.in',
    roleLabel: 'System Administrator',
    roleBadgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    organization: 'AICTE HQ',
  },
]

export const LoginPage: React.FC = () => {
  const { login, registerInstitution } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedPresetEmail, setSelectedPresetEmail] = useState<string>('principal@iiitm-delhi.ac.in')

  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentAreaRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // Login form hook
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    setValue: setLoginValue,
    watch: watchLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'principal@iiitm-delhi.ac.in',
      password: 'password123',
    },
  })

  // Registration form hook
  const {
    register: registerInst,
    handleSubmit: handleSubmitRegister,
    formState: { errors: regErrors },
    reset: resetRegForm,
  } = useForm<RegisterInstitutionFormData>({
    resolver: zodResolver(registerInstitutionSchema),
    defaultValues: {
      institutionCode: '',
      institutionName: '',
      principalName: '',
      email: '',
      password: '',
      state: 'Delhi',
      city: '',
      type: 'Government',
      contactPhone: '',
    },
  })

  const currentEmail = watchLogin('email')

  // Keep selected preset in sync with current email input
  useEffect(() => {
    setSelectedPresetEmail(currentEmail)
  }, [currentEmail])

  // GSAP Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Subtle ambient motion for background lighting
      gsap.to('.ambient-orb-1', {
        x: 25,
        y: -20,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      gsap.to('.ambient-orb-2', {
        x: -25,
        y: 20,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      // Master entrance timeline
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(
        cardRef.current,
        { opacity: 0, y: 35, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85 }
      )
        .fromTo(
          logoRef.current,
          { opacity: 0, scale: 0.7, y: -10 },
          { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.7)' },
          '-=0.55'
        )
        .fromTo(
          headerRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.5 },
          '-=0.45'
        )
        .fromTo(
          '.gsap-form-item',
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
          '-=0.35'
        )
        .fromTo(
          '.gsap-preset-item',
          { opacity: 0, y: 12, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.07 },
          '-=0.25'
        )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  // Animate tab switch between Login and Register
  const switchMode = (newMode: 'login' | 'register') => {
    setServerError(null)
    setMode(newMode)
    if (contentAreaRef.current) {
      gsap.fromTo(
        contentAreaRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      )
    }
  }

  // GSAP Shake Animation on Authentication Error
  useEffect(() => {
    if (serverError && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { x: -8 },
        {
          x: 0,
          duration: 0.45,
          ease: 'elastic.out(1, 0.3)',
        }
      )
      if (errorRef.current) {
        gsap.fromTo(
          errorRef.current,
          { opacity: 0, y: -6, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
        )
      }
    }
  }, [serverError])

  const selectPreset = (preset: LoginPreset) => {
    setSelectedPresetEmail(preset.email)
    setLoginValue('email', preset.email, { shouldValidate: true })
    setLoginValue('password', 'password123', { shouldValidate: true })
    setServerError(null)
  }

  const onLoginSubmit = async (data: LoginFormData) => {
    setServerError(null)
    setSubmitting(true)
    try {
      const user = await login(data.email, data.password)
      const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname
      if (stateFrom && stateFrom !== '/login' && stateFrom !== '/unauthorized' && stateFrom !== '/') {
        navigate(stateFrom, { replace: true })
      } else {
        if (user.role === 'INSTITUTION_USER') {
          navigate('/fdrs', { replace: true })
        } else if (user.role === 'REVIEWER') {
          navigate('/verification', { replace: true })
        } else if (user.role === 'APPROVER') {
          navigate('/renewals', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        setServerError('Authentication failed. Please verify credentials or connection.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onRegisterSubmit = async (data: RegisterInstitutionFormData) => {
    setServerError(null)
    setSubmitting(true)
    try {
      const user = await registerInstitution(data)
      resetRegForm()
      // Immediately navigate newly registered institution to FDR portal
      navigate('/fdrs', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        setServerError('Registration failed. Please check your institution details.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/50 relative overflow-hidden select-none"
    >
      {/* Ambient background lighting with GSAP motion */}
      <div
        className="ambient-orb-1 absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-blue-200/35 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="ambient-orb-2 absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-amber-100/40 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Spacious, Elegant Login / Register Window */}
      <div
        ref={cardRef}
        className="relative z-10 w-full max-w-xl sm:max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.08)] rounded-3xl p-7 sm:p-10 md:p-11"
      >
        {/* Official Logo and Name */}
        <div ref={logoRef} className="flex justify-center mb-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-center">
            <img
              src="/aicte-logo.png"
              alt="AICTE Logo"
              width={76}
              height={76}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div ref={headerRef} className="text-center space-y-1.5 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
            All India Council for Technical Education
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            सुरक्षाकोष · Statutory Security Deposit & FDR Regulatory Registry
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Institution Registration */}
        <div className="flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70 mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Register Institution</span>
          </button>
        </div>

        {/* Inline Server Error with GSAP Shake */}
        {serverError && (
          <div
            ref={errorRef}
            role="alert"
            className="p-3.5 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Notice</span>
              <span className="text-[11px] text-rose-800 leading-normal">{serverError}</span>
            </div>
          </div>
        )}

        <div ref={contentAreaRef}>
          {mode === 'login' ? (
            /* --- SIGN IN MODE --- */
            <div>
              <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4">
                <div className="gsap-form-item">
                  <Field label="Official Portal Email" required error={loginErrors.email?.message}>
                    <Input
                      {...registerLogin('email')}
                      type="email"
                      placeholder="name@institution.ac.in or name@aicte.gov.in"
                      error={Boolean(loginErrors.email)}
                      leftElement={<Mail className="w-4 h-4 text-slate-400" />}
                      autoComplete="email"
                      inputSize="comfortable"
                    />
                  </Field>
                </div>

                <div className="gsap-form-item">
                  <Field label="Password / Passcode" required error={loginErrors.password?.message}>
                    <Input
                      {...registerLogin('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      error={Boolean(loginErrors.password)}
                      leftElement={<Lock className="w-4 h-4 text-slate-400" />}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center p-0.5 focus:outline-none cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                      autoComplete="current-password"
                      inputSize="comfortable"
                    />
                  </Field>
                </div>

                <div className="gsap-form-item pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="comfortable"
                    loading={submitting}
                    className="w-full justify-center bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-medium rounded-xl h-11 sm:h-12 shadow-sm transition-all text-sm tracking-wide"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Sign In to Portal
                  </Button>
                </div>
              </form>

              {/* Institution Not Part Banner */}
              <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Institution not yet on AICTE सुरक्षाकोष?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  Register Now →
                </button>
              </div>

              {/* Select from different logins below */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Select Account to Log In
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Click any role to auto-fill
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LOGIN_PRESETS.map((preset) => {
                    const isSelected = selectedPresetEmail === preset.email

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => selectPreset(preset)}
                        className={`gsap-preset-item relative text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer group flex flex-col justify-between ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50/90 ring-1 ring-slate-900/40 shadow-sm'
                            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${preset.roleBadgeColor}`}
                          >
                            {preset.roleLabel}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                          )}
                        </div>

                        <div>
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm block group-hover:text-black">
                            {preset.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono block truncate mt-0.5">
                            {preset.email}
                          </span>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{preset.organization}</span>
                          <span className="text-slate-500 font-medium group-hover:text-slate-800">
                            {isSelected ? 'Selected' : 'Use Account →'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* --- INSTITUTION REGISTRATION MODE --- */
            <div>
              <div className="mb-5 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  New Institution Regulatory Registration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register your technical institution to start recording, tracking, and verifying FDR compliance.
                </p>
              </div>

              <form onSubmit={handleSubmitRegister(onRegisterSubmit)} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="AICTE Permanent Institute ID"
                    required
                    error={regErrors.institutionCode?.message}
                  >
                    <Input
                      {...registerInst('institutionCode')}
                      placeholder="e.g. 1-10023412"
                      error={Boolean(regErrors.institutionCode)}
                      leftElement={<FileBadge className="w-4 h-4 text-slate-400" />}
                      inputSize="comfortable"
                    />
                  </Field>

                  <Field
                    label="Institution Legal Name"
                    required
                    error={regErrors.institutionName?.message}
                  >
                    <Input
                      {...registerInst('institutionName')}
                      placeholder="e.g. Delhi Institute of Technology"
                      error={Boolean(regErrors.institutionName)}
                      leftElement={<Building2 className="w-4 h-4 text-slate-400" />}
                      inputSize="comfortable"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="State / UT" required error={regErrors.state?.message}>
                    <Input
                      {...registerInst('state')}
                      placeholder="e.g. Delhi"
                      error={Boolean(regErrors.state)}
                      leftElement={<MapPin className="w-4 h-4 text-slate-400" />}
                      inputSize="comfortable"
                    />
                  </Field>

                  <Field label="City / District" required error={regErrors.city?.message}>
                    <Input
                      {...registerInst('city')}
                      placeholder="e.g. New Delhi"
                      error={Boolean(regErrors.city)}
                      inputSize="comfortable"
                    />
                  </Field>

                  <Field label="Institution Type" required error={regErrors.type?.message}>
                    <select
                      {...registerInst('type')}
                      className="w-full h-10 px-3 bg-white text-slate-900 border border-slate-200/90 rounded-lg text-sm focus:border-slate-900 focus:outline-none"
                    >
                      <option value="Government">Government</option>
                      <option value="Govt-Aided">Govt-Aided</option>
                      <option value="Private-Unaided">Private-Unaided</option>
                      <option value="University">University</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Principal / Signatory Full Name"
                    required
                    error={regErrors.principalName?.message}
                  >
                    <Input
                      {...registerInst('principalName')}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      error={Boolean(regErrors.principalName)}
                      inputSize="comfortable"
                    />
                  </Field>

                  <Field
                    label="Contact Phone Number"
                    error={regErrors.contactPhone?.message}
                  >
                    <Input
                      {...registerInst('contactPhone')}
                      placeholder="+91 11 2690 7400"
                      leftElement={<Phone className="w-4 h-4 text-slate-400" />}
                      inputSize="comfortable"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Official Institutional Email"
                    required
                    error={regErrors.email?.message}
                  >
                    <Input
                      {...registerInst('email')}
                      type="email"
                      placeholder="principal@institution.ac.in"
                      error={Boolean(regErrors.email)}
                      leftElement={<Mail className="w-4 h-4 text-slate-400" />}
                      inputSize="comfortable"
                    />
                  </Field>

                  <Field
                    label="Portal Access Password"
                    required
                    error={regErrors.password?.message}
                  >
                    <Input
                      {...registerInst('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      error={Boolean(regErrors.password)}
                      leftElement={<Lock className="w-4 h-4 text-slate-400" />}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center p-0.5 focus:outline-none cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                      inputSize="comfortable"
                    />
                  </Field>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="comfortable"
                    loading={submitting}
                    className="w-full justify-center bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-medium rounded-xl h-11 sm:h-12 shadow-sm transition-all text-sm tracking-wide"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Complete Registration & Enter Portal
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium hover:underline cursor-pointer"
                  >
                    ← Already registered? Back to Portal Sign In
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
