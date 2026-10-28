import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Upload,
  Building,
  Landmark,
  ShieldCheck,
  Send,
  RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Field } from '@/components/forms/Field'
import { CurrencyInput } from '@/components/forms/CurrencyInput'
import { DateField } from '@/components/forms/DateField'
import { PreSubmissionCheckTable } from '@/components/verification/PreSubmissionCheckTable'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/feedback/Toast'

const fdrSchema = z
  .object({
    institutionId: z.string().min(1, 'Institution is required'),
    instrumentType: z.enum(['FDR', 'SECURITY_DEPOSIT']),
    fdrNumber: z.string().min(4, 'Valid reference or certificate number is required'),
    bankName: z.string().min(2, 'Commercial bank is required'),
    branchName: z.string().min(2, 'Branch name or locality is required'),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Must be an 11-character IFSC code (e.g. SBIN0008077)'),
    accountNumber: z.string().min(6, 'Deposit account number is required'),
    amount: z.number().int().positive('Deposit amount must be a positive integer in whole rupees'),
    interestRate: z.number().min(0.1, 'Interest rate is required'),
    issueDate: z.string().min(1, 'Issue date is required'),
    maturityDate: z.string().min(1, 'Maturity date is required'),
    jointAccount: z.boolean(),
    lienMarked: z.boolean(),
    autoRenewal: z.boolean(),
  })
  .refine(
    (data) => {
      if (!data.issueDate || !data.maturityDate) return true
      return new Date(data.maturityDate) > new Date(data.issueDate)
    },
    {
      message: 'Maturity date must strictly follow the issue date',
      path: ['maturityDate'],
    }
  )

type FDRFormData = z.infer<typeof fdrSchema>

const STEPS = [
  { step: 1, title: 'Details', desc: 'Instrument & Bank' },
  { step: 2, title: 'Documents', desc: 'Required Scans & Extraction' },
  { step: 3, title: 'Cross-Check', desc: 'Parameter Verification' },
  { step: 4, title: 'Bank Gateway', desc: 'SFMS & Core Banking' },
  { step: 5, title: 'Submit', desc: 'Enforced Submission Gate' },
]

export const NewFDRPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()

  const urlFdrId = searchParams.get('id')
  const [activeStep, setActiveStep] = useState<number>(1)
  const [createdFdrId, setCreatedFdrId] = useState<string | null>(urlFdrId)
  const [maxStepReached, setMaxStepReached] = useState<number>(1)
  const [apiError, setApiError] = useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [slotStatusMap, setSlotStatusMap] = useState<
    Record<string, { status: 'Queued' | 'Reading' | 'Done' | 'Failed'; fileName?: string }>
  >({})

  // Keep search params in sync with draft ID so refreshes preserve state
  useEffect(() => {
    if (createdFdrId && searchParams.get('id') !== createdFdrId) {
      setSearchParams({ id: createdFdrId }, { replace: true })
    }
  }, [createdFdrId, searchParams, setSearchParams])

  // Track the highest step reached
  useEffect(() => {
    setMaxStepReached((prev) => Math.max(prev, activeStep))
  }, [activeStep])

  // Fetch institutions
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.institutions.list(),
  })

  // Fetch required document slots
  const { data: requiredSlotsData } = useQuery({
    queryKey: ['required-slots', 'FDR'],
    queryFn: () => api.fdrs.getRequiredSlots('FDR'),
  })

  const requiredSlots = requiredSlotsData?.requiredSlots || [
    'FDR_CERTIFICATE',
    'BANK_CONFIRMATION_LETTER',
    'LIEN_ENDORSEMENT',
    'INSTITUTION_REQUEST_LETTER',
  ]
  const slotDescriptions = requiredSlotsData?.descriptions || {
    FDR_CERTIFICATE: 'Original Fixed Deposit Receipt issued by scheduled bank',
    BANK_CONFIRMATION_LETTER: 'Official confirmation letter or stamped bank statement',
    LIEN_ENDORSEMENT: 'Lien marked in favour of Member Secretary, AICTE',
    INSTITUTION_REQUEST_LETTER: 'Institutional submission request signed by Head',
  }

  // Fetch draft instrument whenever createdFdrId exists
  const { data: currentFdr, refetch: refetchCurrentFdr } = useQuery({
    queryKey: ['fdr-draft', createdFdrId],
    queryFn: () => (createdFdrId ? api.fdrs.getById(createdFdrId) : null),
    enabled: Boolean(createdFdrId),
  })

  // Precheck Query (Runs whenever createdFdrId exists)
  const {
    data: precheckData,
    refetch: refetchPrecheck,
    isLoading: isPrecheckLoading,
  } = useQuery({
    queryKey: ['fdr-precheck', createdFdrId],
    queryFn: () => (createdFdrId ? api.fdrs.runPrecheck(createdFdrId) : null),
    enabled: Boolean(createdFdrId),
    refetchInterval: activeStep === 2 ? 3000 : false, // Poll extraction status on Step 2
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FDRFormData>({
    resolver: zodResolver(fdrSchema),
    defaultValues: {
      institutionId: user?.institutionId || 'inst-1',
      instrumentType: 'FDR',
      fdrNumber: `FDR/SBI/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`,
      bankName: 'State Bank of India',
      branchName: '',
      ifscCode: 'SBIN0008077',
      accountNumber: '',
      amount: 10000000,
      interestRate: 7.25,
      issueDate: new Date().toISOString().slice(0, 10),
      maturityDate: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      jointAccount: true,
      lienMarked: true,
      autoRenewal: false,
    },
  })

  const formValues = watch()

  // Sync form defaults when currentFdr draft loads (only if user hasn't dirtied form)
  useEffect(() => {
    if (currentFdr && !isDirty) {
      reset({
        institutionId: currentFdr.institutionId || user?.institutionId || 'inst-1',
        instrumentType: (currentFdr.instrumentType as any) || 'FDR',
        fdrNumber: currentFdr.referenceNumber || currentFdr.fdrNumber || '',
        bankName: currentFdr.bankName || 'State Bank of India',
        branchName: currentFdr.branchName || '',
        ifscCode: currentFdr.ifscCode || 'SBIN0008077',
        accountNumber: currentFdr.accountNumber || '',
        amount: Number(currentFdr.depositAmount ?? currentFdr.amount) || 10000000,
        interestRate: Number(currentFdr.interestRate) || 7.25,
        issueDate: currentFdr.issueDate
          ? new Date(currentFdr.issueDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        maturityDate: currentFdr.maturityDate
          ? new Date(currentFdr.maturityDate).toISOString().slice(0, 10)
          : '',
        jointAccount: Boolean(currentFdr.jointAccount ?? true),
        lienMarked: Boolean(currentFdr.lienMarked ?? true),
        autoRenewal: Boolean(currentFdr.autoRenewal ?? false),
      })
      if (currentFdr.documents && currentFdr.documents.length > 0) {
        setMaxStepReached((prev) => Math.max(prev, 3))
      }
    }
  }, [currentFdr, isDirty, reset, user?.institutionId])

  // Synchronize slot extraction chips from currentFdr and precheck response
  useEffect(() => {
    if (!createdFdrId) return
    const updatedMap: Record<string, { status: 'Queued' | 'Reading' | 'Done' | 'Failed'; fileName?: string }> = {}

    // 1. From database documents
    if (currentFdr?.documents) {
      for (const doc of currentFdr.documents) {
        const slot = doc.slotType || doc.documentType
        if (slot) {
          const extStatus = doc.extraction?.status || 'DONE'
          let chipStatus: 'Queued' | 'Reading' | 'Done' | 'Failed' = 'Done'
          if (extStatus === 'PENDING') chipStatus = 'Reading'
          else if (extStatus === 'FAILED') chipStatus = 'Failed'
          else chipStatus = 'Done'

          updatedMap[slot] = {
            status: chipStatus,
            fileName: doc.originalFilename || doc.fileName,
          }
        }
      }
    }

    // 2. From precheck slotSummary
    if (precheckData?.slotSummary) {
      for (const s of precheckData.slotSummary) {
        if (s.uploaded) {
          let chipStatus: 'Queued' | 'Reading' | 'Done' | 'Failed' = 'Done'
          if (s.extractionStatus === 'PENDING') chipStatus = 'Reading'
          else if (s.extractionStatus === 'FAILED') chipStatus = 'Failed'
          else chipStatus = 'Done'

          updatedMap[s.slotType] = {
            status: chipStatus,
            fileName: s.fileName || updatedMap[s.slotType]?.fileName,
          }
        }
      }
    }

    // 3. From precheck extractions
    if (precheckData?.extractions) {
      for (const [slot, ext] of Object.entries(precheckData.extractions)) {
        let chipStatus: 'Queued' | 'Reading' | 'Done' | 'Failed' = 'Done'
        if (ext.status === 'PENDING') chipStatus = 'Reading'
        else if (ext.status === 'FAILED') chipStatus = 'Failed'
        else chipStatus = 'Done'

        updatedMap[slot] = {
          status: chipStatus,
          fileName: updatedMap[slot]?.fileName,
        }
      }
    }

    if (Object.keys(updatedMap).length > 0) {
      setSlotStatusMap((prev) => ({ ...prev, ...updatedMap }))
      const hasAnyDone = Object.values(updatedMap).some((v) => v.status === 'Done')
      if (hasAnyDone) {
        setMaxStepReached((prev) => Math.max(prev, 3))
      }
    }
  }, [currentFdr, precheckData, createdFdrId])

  // Step 1: Save or Update Draft Instrument
  const handleSaveDraft = async (data: FDRFormData, nextStep = 2) => {
    setApiError(null)
    try {
      const payload = {
        institutionId: data.institutionId,
        instrumentType: data.instrumentType,
        referenceNumber: data.fdrNumber,
        bankName: data.bankName,
        branchName: data.branchName,
        ifscCode: data.ifscCode,
        accountNumber: data.accountNumber,
        depositAmount: data.amount,
        amount: data.amount,
        interestRate: data.interestRate,
        issueDate: data.issueDate,
        maturityDate: data.maturityDate,
        jointAccount: data.jointAccount,
        lienMarked: data.lienMarked,
        autoRenewal: data.autoRenewal,
      }

      if (createdFdrId) {
        await api.fdrs.update(createdFdrId, payload)
        toast({
          title: 'Parameters updated',
          description: 'Instrument details updated. Cross-check recalculated.',
          type: 'info',
        })
        await refetchCurrentFdr()
        await refetchPrecheck()
      } else {
        const created = await api.fdrs.create(payload)
        setCreatedFdrId(created.id)
        toast({
          title: 'Draft created',
          description: `Instrument ${created.fdrNumber || created.referenceNumber} initialized.`,
          type: 'success',
        })
      }
      setActiveStep(nextStep)
    } catch (err: any) {
      setApiError(err.message || 'Failed to save instrument details. Please review inputs.')
    }
  }

  // Stepper Header click handler
  const isStepAccessible = (targetStep: number) => {
    if (targetStep === 1) return true
    if (!createdFdrId) return false
    if (targetStep === 2) return true
    const hasDocuments =
      Object.values(slotStatusMap).some((s) => s.status === 'Done') ||
      Boolean(currentFdr?.documents && currentFdr.documents.length > 0) ||
      Boolean(precheckData?.slotSummary && precheckData.slotSummary.some((s: any) => s.uploaded))
    return maxStepReached >= targetStep || hasDocuments || targetStep <= 3
  }

  const handleStepClick = (targetStep: number) => {
    if (targetStep === activeStep) return
    if (!isStepAccessible(targetStep)) return

    if (activeStep === 1) {
      handleSubmit((data) => handleSaveDraft(data, targetStep))()
    } else {
      setActiveStep(targetStep)
    }
  }

  // Step 2: Upload file for a specific slot
  const handleUploadSlot = async (slot: string, file: File) => {
    if (!createdFdrId) {
      setApiError('Please save instrument parameters before uploading documents.')
      return
    }

    setUploadingSlot(slot)
    setSlotStatusMap((prev) => ({
      ...prev,
      [slot]: { status: 'Reading', fileName: file.name },
    }))

    try {
      await api.fdrs.uploadDocument(createdFdrId, file, slot, slot)
      setSlotStatusMap((prev) => ({
        ...prev,
        [slot]: { status: 'Done', fileName: file.name },
      }))
      toast({
        title: 'Document extracted',
        description: `Uploaded and parsed ${slot.replace(/_/g, ' ')}.`,
        type: 'success',
      })
      await refetchCurrentFdr()
      await refetchPrecheck()
    } catch (err: any) {
      setSlotStatusMap((prev) => ({
        ...prev,
        [slot]: { status: 'Failed', fileName: file.name },
      }))
      toast({
        title: 'Upload error',
        description: err.message || `Failed to process ${slot}.`,
        type: 'danger',
      })
    } finally {
      setUploadingSlot(null)
    }
  }

  // Step 4: Run Bank Precheck
  const [runningBankCheck, setRunningBankCheck] = useState(false)
  const handleRunBankVerification = async () => {
    if (!createdFdrId) return
    setRunningBankCheck(true)
    try {
      await api.fdrs.runPrecheck(createdFdrId)
      await refetchPrecheck()
      toast({
        title: 'Bank gateway verified',
        description: 'Core banking status updated.',
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Bank check failed',
        description: err.message,
        type: 'danger',
      })
    } finally {
      setRunningBankCheck(false)
    }
  }

  // Step 5: Final Submission
  const [submittingFinal, setSubmittingFinal] = useState(false)
  const handleFinalSubmit = async () => {
    if (!createdFdrId) return
    setSubmittingFinal(true)
    setApiError(null)
    try {
      const submitted = await api.fdrs.submit(createdFdrId)
      toast({
        title: 'Submission complete',
        description: `Instrument ${submitted.fdrNumber || submitted.referenceNumber} is now Submitted.`,
        type: 'success',
      })
      navigate(`/fdrs/${createdFdrId}`)
    } catch (err: any) {
      setApiError(err.message || 'Submission blocked by statutory gate. Please inspect blockers.')
      refetchPrecheck()
    } finally {
      setSubmittingFinal(false)
    }
  }

  const allSlotsUploaded = requiredSlots.every((s) => slotStatusMap[s]?.status === 'Done')
  const uploadedCount = requiredSlots.filter((s) => slotStatusMap[s]?.status === 'Done').length

  return (
    <div className="space-y-4">
      {/* Return button */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="compact"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/fdrs')}
        >
          Cancel & return to registry
        </Button>
      </div>

      <PageHeader
        title="Register New Instrument"
        description="Enter deposit parameters, upload statutory documents, run cross-match verification, and submit."
      />

      {/* Stepper Progress Bar */}
      <Card className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {STEPS.map((s) => {
            const isCurrent = activeStep === s.step
            const accessible = isStepAccessible(s.step)
            const isDone =
              (s.step === 1 && Boolean(createdFdrId)) ||
              (s.step === 2 && allSlotsUploaded) ||
              (s.step === 3 && maxStepReached > 3) ||
              (s.step === 4 && Boolean(precheckData?.bankReceipt)) ||
              s.step < activeStep

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => handleStepClick(s.step)}
                disabled={!accessible}
                className={`text-left p-2.5 rounded-md transition-all border text-xs ${
                  isCurrent
                    ? 'bg-surface border-ink-900 shadow-sm ring-1 ring-ink-900 text-ink-900'
                    : accessible
                    ? 'bg-surface border-line text-ink-700 hover:bg-canvas cursor-pointer'
                    : 'bg-canvas text-ink-500 border-line/60 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium ${
                      isCurrent
                        ? 'bg-ink-900 text-white'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-canvas border border-line text-ink-700'
                    }`}
                  >
                    {isDone ? '✓' : s.step}
                  </span>
                  <span className="font-medium truncate">{s.title}</span>
                </div>
                <p className="text-[11px] text-ink-500 mt-1 truncate">
                  {s.desc}
                </p>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Global Error Banner */}
      {apiError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{apiError}</span>
        </div>
      )}

      {/* STEP 1: DETAILS */}
      {activeStep === 1 && (
        <form onSubmit={handleSubmit((data) => handleSaveDraft(data, 2))} className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-ink-700" />
                <span>1. Institution & classification</span>
              </h2>
              {createdFdrId && (
                <span className="text-xs bg-canvas text-ink-700 px-2.5 py-0.5 rounded-full font-mono border border-line tabular-nums">
                  Active draft
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="AICTE Permanent institution" required error={errors.institutionId?.message}>
                <Select {...register('institutionId')}>
                  {institutions.length > 0 ? (
                    institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name.replace(/^\[DEMO\]\s*/i, '')} ({inst.aictePermanentId})
                      </option>
                    ))
                  ) : (
                    <option value="inst-1">IIITM Delhi (1-10023412)</option>
                  )}
                </Select>
              </Field>

              <Field label="Deposit type" required error={errors.instrumentType?.message}>
                <Select {...register('instrumentType')}>
                  <option value="FDR">Fixed Deposit Receipt (FDR)</option>
                  <option value="SECURITY_DEPOSIT">Cash Security Deposit</option>
                </Select>
              </Field>

              <Field
                label="FDR / Certificate reference number"
                required
                error={errors.fdrNumber?.message}
                hint="As printed on original receipt."
              >
                <Input {...register('fdrNumber')} />
              </Field>

              <Field
                label="Commercial bank"
                required
                error={errors.bankName?.message}
                hint="RBI-recognized scheduled bank."
              >
                <Select {...register('bankName')}>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Union Bank of India">Union Bank of India</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                </Select>
              </Field>

              <Field label="Branch name & locality" required error={errors.branchName?.message}>
                <Input {...register('branchName')} placeholder="e.g. Okhla Phase 3 / Main Branch" />
              </Field>

              <Field
                label="IFSC code"
                required
                error={errors.ifscCode?.message}
                hint="11 alphanumeric characters (e.g. SBIN0008077)."
              >
                <Input {...register('ifscCode')} placeholder="SBIN0008077" />
              </Field>

              <Field label="Deposit account number" required error={errors.accountNumber?.message}>
                <Input {...register('accountNumber')} placeholder="e.g. 1029384756" />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-ink-700" />
                <span>Financial values & mandates</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Principal amount (₹)"
                required
                error={errors.amount?.message}
                hint="Whole rupees as sanctioned."
              >
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
              </Field>

              <Field label="Annual interest rate (%)" required error={errors.interestRate?.message}>
                <Input
                  type="number"
                  step="0.01"
                  {...register('interestRate', { valueAsNumber: true })}
                />
              </Field>

              <div />

              <Field label="Deposit issue date" required error={errors.issueDate?.message}>
                <DateField {...register('issueDate')} />
              </Field>

              <Field
                label="Maturity date"
                required
                error={errors.maturityDate?.message}
                hint="Must be strictly after issue date."
              >
                <DateField {...register('maturityDate')} />
              </Field>
            </div>

            <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-xs text-ink-900 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('jointAccount')}
                  className="rounded border-line text-ink-900 focus:ring-ink-900"
                />
                <span>Joint name with AICTE</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-ink-900 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('lienMarked')}
                  className="rounded border-line text-ink-900 focus:ring-ink-900"
                />
                <span>Lien endorsed to AICTE</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-ink-900 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('autoRenewal')}
                  className="rounded border-line text-ink-900 focus:ring-ink-900"
                />
                <span>Auto-renewal authorized</span>
              </label>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              {createdFdrId && (
                <span className="text-xs text-ink-500">
                  Draft reference: <strong className="font-mono text-ink-900 tabular-nums">{formValues.fdrNumber}</strong>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {createdFdrId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSubmit((data) => handleSaveDraft(data, 3))()}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Save & jump to Cross-Check (Step 3)
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {createdFdrId ? 'Save & proceed to Documents (Step 2)' : 'Save & proceed to Documents (Step 2)'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2: DOCUMENTS */}
      {activeStep === 2 && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ink-700" />
                  <span>2. Upload required document slots</span>
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  Every instrument requires all 4 statutory slots. Scans are extracted in-memory on the server.
                </p>
              </div>

              <div className="text-xs bg-canvas text-ink-700 px-2.5 py-1 rounded-full border border-line font-medium tabular-nums">
                {uploadedCount} of {requiredSlots.length} slots uploaded
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requiredSlots.map((slot) => {
                const info = slotStatusMap[slot]
                const status = info?.status || 'Queued'
                const isUploading = uploadingSlot === slot

                return (
                  <div key={slot} className="p-3.5 rounded-md border border-line bg-surface space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-ink-900 text-xs block">
                          {slot.replace(/_/g, ' ')}
                        </span>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                          {slotDescriptions[slot] || 'Statutory document'}
                        </p>
                      </div>

                      {/* Extraction Status Chip */}
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium text-[11px] px-2.5 py-0.5 rounded-full border ${
                          status === 'Done'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : status === 'Reading'
                            ? 'bg-accent-subtle text-accent-primary border-accent-primary/30'
                            : status === 'Failed'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-canvas text-ink-500 border-line'
                        }`}
                      >
                        {status === 'Reading' && <RefreshCw className="w-3 h-3 animate-spin text-accent-primary" />}
                        {status === 'Done' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                        {status === 'Failed' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
                        {status === 'Queued' && <span className="w-1.5 h-1.5 rounded-full bg-ink-500" />}
                        <span>{status === 'Reading' ? 'Extracting...' : status}</span>
                      </span>
                    </div>

                    {info?.fileName && (
                      <div className="text-[11px] text-ink-700 font-mono bg-canvas p-1.5 rounded border border-line truncate">
                        Attached: <strong>{info.fileName}</strong>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id={`upload-${slot}`}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleUploadSlot(slot, f)
                        }}
                      />
                      <label
                        htmlFor={`upload-${slot}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors border ${
                          isUploading
                            ? 'bg-canvas text-ink-500 border-line cursor-not-allowed'
                            : info?.fileName
                            ? 'bg-surface text-ink-900 border-line hover:bg-canvas'
                            : 'bg-ink-900 text-white border-ink-900 hover:bg-ink-800'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{info?.fileName ? 'Replace document' : 'Upload document'}</span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              variant="secondary"
              size="compact"
              onClick={() => setActiveStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Details (Step 1)
            </Button>
            <Button
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setActiveStep(3)}
            >
              Proceed to Cross-Check (Step 3)
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: CROSS-CHECK */}
      {activeStep === 3 && (
        <div className="space-y-4">
          <PreSubmissionCheckTable
            precheck={precheckData || null}
            isLoading={isPrecheckLoading}
            onFixField={(step) => setActiveStep(step)}
          />

          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setActiveStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Edit Details (Step 1)
              </Button>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setActiveStep(2)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Manage Documents (Step 2)
              </Button>
            </div>
            <Button
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setActiveStep(4)}
            >
              Proceed to Bank Gateway (Step 4)
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: BANK VERIFICATION */}
      {activeStep === 4 && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-ink-700" />
                  <span>4. Core banking gateway verification</span>
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  Verification queried against scheduled banking network.
                </p>
              </div>

              <Button
                variant="secondary"
                size="compact"
                loading={runningBankCheck}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={handleRunBankVerification}
              >
                Re-query bank gateway
              </Button>
            </div>

            {precheckData?.bankReceipt ? (
              <div className="p-3.5 rounded-md border border-line bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-900 text-xs">
                    Receipt reference: <strong className="font-mono tabular-nums">{precheckData.bankReceipt.receiptRef}</strong>
                  </span>
                  {precheckData.bankReceipt.simulated && (
                    <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900">
                      Simulation record
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-ink-500 block text-[11px]">Integration mode</span>
                    <span className="font-medium text-ink-900">
                      {precheckData.bankReceipt.source}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-500 block text-[11px]">Timestamp</span>
                    <span className="font-mono text-ink-900 tabular-nums">
                      {precheckData.bankReceipt.receivedAt}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-500 block text-[11px]">Receipt status</span>
                    <div className="mt-0.5">
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium text-xs px-2.5 py-0.5 rounded-full border ${
                          precheckData.bankReceipt.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${precheckData.bankReceipt.status === 'CONFIRMED' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        <span>{precheckData.bankReceipt.status}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-canvas border border-line rounded-md text-center text-xs text-ink-500">
                No bank receipt recorded yet. Click &quot;Re-query bank gateway&quot; to verify instrument against core banking records.
              </div>
            )}
          </Card>

          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setActiveStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Details (Step 1)
              </Button>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setActiveStep(3)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Cross-Check (Step 3)
              </Button>
            </div>
            <Button
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setActiveStep(5)}
            >
              Proceed to Final Submission (Step 5)
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: FINAL SUBMIT */}
      {activeStep === 5 && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-ink-700" />
                <span>5. Server-enforced statutory submission gate</span>
              </h2>
            </div>

            {precheckData?.canSubmit ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-md text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All pre-submission checks passed</span>
                </div>
                <p className="text-emerald-800 text-xs leading-relaxed">
                  Every required document slot is present, extraction completed with no parameter discrepancies, and core banking verification confirmed the instrument.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-md text-xs text-rose-950 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-rose-900">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Submission gate blocked</span>
                </div>
                <p className="text-rose-800 text-xs">
                  The following blockers prevent submission:
                </p>
                <ul className="list-disc pl-5 space-y-1 font-mono text-xs text-rose-900">
                  {precheckData?.blockers?.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  )) || <li>Evaluating pre-submission gate...</li>}
                </ul>
              </div>
            )}

            {/* Summary review of instrument */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-3 border-t border-line">
              <div>
                <span className="text-ink-500 block text-[11px]">Instrument ref</span>
                <span className="font-mono font-medium text-ink-900 tabular-nums">{formValues.fdrNumber}</span>
              </div>
              <div>
                <span className="text-ink-500 block text-[11px]">Bank</span>
                <span className="font-medium text-ink-900">{formValues.bankName}</span>
              </div>
              <div>
                <span className="text-ink-500 block text-[11px]">Principal amount</span>
                <span className="font-mono font-medium text-ink-900 tabular-nums">₹{formValues.amount?.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-ink-500 block text-[11px]">Maturity date</span>
                <span className="font-mono text-ink-900 tabular-nums">{formValues.maturityDate}</span>
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setActiveStep(3)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Review Cross-Check (Step 3)
              </Button>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setActiveStep(4)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Bank Gateway (Step 4)
              </Button>
            </div>
            <Button
              variant="primary"
              loading={submittingFinal}
              disabled={!precheckData?.canSubmit}
              onClick={handleFinalSubmit}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Submit to registry
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
