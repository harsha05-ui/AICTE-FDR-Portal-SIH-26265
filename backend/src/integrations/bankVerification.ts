import { prisma } from '../lib/prisma'
import { getSetting } from '../lib/settings'

export type BankVerificationStatus =
  | 'CONFIRMED'
  | 'NOT_FOUND'
  | 'MISMATCH'
  | 'NOT_INTEGRATED'
  | 'MANUAL_REVIEW'

export interface BankVerificationResult {
  status: BankVerificationStatus
  source: string
  simulated: boolean
  details?: Record<string, unknown>
}

export interface InstrumentVerificationInput {
  id: string
  referenceNumber: string
  bankName: string
  branchName?: string | null
  ifscCode?: string | null
  accountNumber?: string | null
  depositAmount: number | string | any
  instrumentType?: string
}

export interface BankVerificationAdapter {
  verify(instrument: InstrumentVerificationInput): Promise<BankVerificationResult>
  verifyInstrument(instrument: InstrumentVerificationInput): Promise<BankVerificationResult>
}

/**
 * 1. ManualAdapter: Default production fallback.
 * Direct SFMS/CBS banking API is not configured; requires manual staff review.
 * NEVER produces BANK_CONFIRMED.
 */
export class ManualAdapter implements BankVerificationAdapter {
  async verifyInstrument(_instrument: InstrumentVerificationInput): Promise<BankVerificationResult> {
    return {
      status: 'NOT_INTEGRATED',
      source: 'MANUAL_REVIEW',
      simulated: false,
      details: {
        reason:
          'Direct SFMS / Core Banking API gateway integration is not configured in this environment. Statutory instruments require physical verification by authorized AICTE compliance officers.',
      },
    }
  }

  async verify(instrument: InstrumentVerificationInput): Promise<BankVerificationResult> {
    return this.verifyInstrument(instrument)
  }
}

/**
 * 2. MockBankAdapter: Reads a seeded simulation database table (BankSimulationRecord).
 * Always marks simulated: true and source: 'MOCK_SFMS_CBS_API'.
 */
export class MockBankAdapter implements BankVerificationAdapter {
  async verifyInstrument(instrument: InstrumentVerificationInput): Promise<BankVerificationResult> {
    try {
      const cleanRef = (instrument.referenceNumber || '').replace(/-ARCHIVED-\d+$/, '').trim()
      let match = await prisma.bankSimulationRecord.findUnique({
        where: {
          bankName_referenceNumber: {
            bankName: instrument.bankName.trim(),
            referenceNumber: cleanRef,
          },
        },
      })

      if (!match) {
        match = await prisma.bankSimulationRecord.findFirst({
          where: {
            referenceNumber: cleanRef,
          },
        })
      }

      // Check if reference is an intentional mismatch test
      if (cleanRef.toUpperCase().includes('MISMATCH') || cleanRef.toUpperCase().includes('FAIL')) {
        return {
          status: 'MISMATCH',
          source: 'MOCK_SFMS_CBS_API',
          simulated: true,
          details: {
            message: `[SIMULATION] Deposit verification failed. Discrepancy detected in bank ledger.`,
          },
        }
      }

      // If it's a DEMO-PASS instrument or any passing test instrument
      if (cleanRef.toUpperCase().includes('PASS') || match?.status === 'CONFIRMED' || !match) {
        const depositAmount = Number(instrument.depositAmount) || (match ? Number(match.depositAmount) : 3500000)
        return {
          status: 'CONFIRMED',
          source: 'MOCK_SFMS_CBS_API',
          simulated: true,
          details: {
            message: `[SIMULATION] Statutory deposit record verified against Core Banking System (CBS) simulation ledger.`,
            bankReference: match?.referenceNumber || cleanRef,
            bankAccount: match?.accountNumber || instrument.accountNumber || '1029384756',
            depositAmount,
            lienMarked: true,
            beneficiaryName: match?.beneficiaryName || 'Member Secretary, AICTE',
            cbsTimestamp: new Date().toISOString(),
          },
        }
      }

      // Fallback amount check if matching a non-pass seeded record
      const expectedAmount = Number(match.depositAmount)
      const inputAmount = Number(instrument.depositAmount)

      if (expectedAmount !== inputAmount) {
        return {
          status: 'MISMATCH',
          source: 'MOCK_SFMS_CBS_API',
          simulated: true,
          details: {
            message: `[SIMULATION] Deposit amount mismatch. Bank ledger reports ₹${expectedAmount}, but submitted instrument claims ₹${inputAmount}.`,
            expectedAmount,
            submittedAmount: inputAmount,
          },
        }
      }

      return {
        status: 'CONFIRMED',
        source: 'MOCK_SFMS_CBS_API',
        simulated: true,
        details: {
          message: `[SIMULATION] Statutory deposit record verified against Core Banking System (CBS) simulation ledger.`,
          bankReference: match.referenceNumber,
          bankAccount: match.accountNumber || instrument.accountNumber,
          depositAmount: expectedAmount,
          lienMarked: match.lienMarked,
          beneficiaryName: match.beneficiaryName,
          cbsTimestamp: new Date().toISOString(),
        },
      }
    } catch (err: any) {
      return {
        status: 'NOT_FOUND',
        source: 'MOCK_SFMS_CBS_API',
        simulated: true,
        details: { error: err.message },
      }
    }
  }

  async verify(instrument: InstrumentVerificationInput): Promise<BankVerificationResult> {
    return this.verifyInstrument(instrument)
  }
}

/**
 * 3. LiveBankAdapter: Live SFMS / NeSL gateway placeholder.
 */
export class LiveBankAdapter implements BankVerificationAdapter {
  async verifyInstrument(_instrument: InstrumentVerificationInput): Promise<BankVerificationResult> {
    return {
      status: 'NOT_INTEGRATED',
      source: 'LIVE_SFMS_GATEWAY',
      simulated: false,
      details: {
        message:
          'Live RBI SFMS / NeSL Electronic Bank Guarantee gateway requires institutional digital signature certificates and production bank bureau credentials.',
      },
    }
  }

  async verify(instrument: InstrumentVerificationInput): Promise<BankVerificationResult> {
    return this.verifyInstrument(instrument)
  }
}

// In-memory override for testing
let adapterOverride: 'MANUAL' | 'MOCK_DEMO' | 'LIVE' | null = null

export function setBankAdapterOverride(mode: 'MANUAL' | 'MOCK_DEMO' | 'LIVE' | null) {
  adapterOverride = mode
}

export async function getBankVerificationAdapter(): Promise<BankVerificationAdapter> {
  const mode = adapterOverride || (await getSetting<string>('verification.adapter_mode', 'MANUAL'))

  switch (mode.toUpperCase()) {
    case 'MOCK_DEMO':
      return new MockBankAdapter()
    case 'LIVE':
      return new LiveBankAdapter()
    case 'MANUAL':
    default:
      return new ManualAdapter()
  }
}

/**
 * Delegating singleton service conforming to the BankVerificationAdapter interface.
 */
export const bankVerificationService: BankVerificationAdapter = {
  async verify(instrument: InstrumentVerificationInput): Promise<BankVerificationResult> {
    const adapter = await getBankVerificationAdapter()
    return adapter.verify(instrument)
  },
  async verifyInstrument(instrument: InstrumentVerificationInput): Promise<BankVerificationResult> {
    const adapter = await getBankVerificationAdapter()
    return adapter.verifyInstrument(instrument)
  },
}
