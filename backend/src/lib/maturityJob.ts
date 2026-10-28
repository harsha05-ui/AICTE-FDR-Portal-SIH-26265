import cron from 'node-cron'
import { prisma } from './prisma'
import { getSetting } from './settings'
import { sendMail } from './mailer'

export const DEFAULT_MATURITY_THRESHOLDS = [90, 60, 30, 15, 7, 0]

export async function runMaturityAndNotificationCheck(): Promise<{
  instrumentsChecked: number
  remindersGenerated: number
  maturedCount: number
  expiringCount: number
  escalationsCount: number
  stageEscalationsCount: number
}> {
  const now = new Date()
  const todayMs = now.getTime()
  const todayStr = now.toISOString().slice(0, 10)

  let remindersGenerated = 0
  let maturedCount = 0
  let expiringCount = 0
  let escalationsCount = 0
  let stageEscalationsCount = 0

  // 1. Read thresholds from setting 'reminders.thresholds_days'
  const maturityThresholds = await getSetting<number[]>(
    'reminders.thresholds_days',
    DEFAULT_MATURITY_THRESHOLDS
  )

  // 2. Read escalation days from setting 'escalation.days'
  const escalationThresholdDays = await getSetting<number>('escalation.days', 3)

  // 3. Fetch non-closed, non-released instruments
  const fdrs = await prisma.fDR.findMany({
    where: {
      lifecycleStatus: { notIn: ['RELEASED', 'RENEWED'] },
    },
    include: {
      institution: {
        include: {
          users: { where: { isActive: true } },
        },
      },
    },
  })

  // Fetch all active staff
  const reviewers = await prisma.user.findMany({
    where: { role: 'REVIEWER', isActive: true },
  })

  const approvers = await prisma.user.findMany({
    where: { role: 'APPROVER', isActive: true },
  })

  for (const fdr of fdrs) {
    if (!fdr.maturityDate) continue

    const maturityMs = new Date(fdr.maturityDate).getTime()
    const diffDays = Math.ceil((maturityMs - todayMs) / (1000 * 60 * 60 * 24))

    // Check if already matured
    if (diffDays <= 0) {
      if (fdr.lifecycleStatus !== 'MATURED') {
        await prisma.fDR.update({
          where: { id: fdr.id },
          data: { lifecycleStatus: 'MATURED' },
        })
        maturedCount++
      }
    } else if (diffDays <= 90) {
      if (fdr.lifecycleStatus !== 'EXPIRING' && fdr.lifecycleStatus !== 'MATURED') {
        await prisma.fDR.update({
          where: { id: fdr.id },
          data: { lifecycleStatus: 'EXPIRING' },
        })
        expiringCount++
      }
    }

    // Check maturity thresholds for reminders
    for (const threshold of maturityThresholds) {
      // Threshold check: diffDays <= threshold and if threshold == 0, check diffDays <= 0
      const matchesThreshold =
        threshold === 0 ? diffDays <= 0 && diffDays >= -7 : diffDays <= threshold && diffDays > 0

      if (matchesThreshold) {
        // Audience: institution users + reviewers
        const recipients = [...fdr.institution.users, ...reviewers]
        for (const recipient of recipients) {
          const idempotencyKey = `mat_${fdr.id}_${threshold}_${recipient.id}`

          const existingNotif = await prisma.notification.findFirst({
            where: {
              OR: [
                { idempotencyKey },
                {
                  fdrId: fdr.id,
                  type: 'MATURITY_ALERT',
                  thresholdDays: threshold,
                  userId: recipient.id,
                },
              ],
            },
          })

          if (!existingNotif) {
            try {
              const urgency = threshold <= 7 ? 'URGENT' : threshold <= 30 ? 'HIGH' : 'NORMAL'
              const title =
                threshold === 0
                  ? `Statutory FDR Matured: Action Required (${fdr.referenceNumber})`
                  : `Statutory Deposit Maturing within ${threshold} Days`
              const message =
                threshold === 0
                  ? `Instrument ${fdr.referenceNumber} (${fdr.bankName}) has reached its maturity date. Immediate renewal docket or formal release petition required.`
                  : `Instrument ${fdr.referenceNumber} (${fdr.bankName}) is scheduled to mature on ${new Date(fdr.maturityDate).toISOString().slice(0, 10)}. Immediate compliance renewal or release docket required.`

              await prisma.notification.create({
                data: {
                  userId: recipient.id,
                  fdrId: fdr.id,
                  type: 'MATURITY_ALERT',
                  thresholdDays: threshold,
                  title,
                  message,
                  urgency,
                  dueDate: fdr.maturityDate,
                  idempotencyKey,
                },
              })
              remindersGenerated++

              // Send email notification asynchronously
              if (recipient.email) {
                sendMail({
                  to: recipient.email,
                  subject: `[AICTE Statutory Portal] ${title}`,
                  text: message,
                }).catch(() => {})
              }
            } catch {
              // Dedup constraint safety fallback
            }
          }
        }
      }
    }

    // Escalation: if verification stays SUBMITTED / UNDER_REVIEW for more than escalationThresholdDays
    if (fdr.verificationStatus === 'SUBMITTED' || fdr.verificationStatus === 'UNDER_REVIEW') {
      const daysInQueue = Math.floor((todayMs - new Date(fdr.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      if (daysInQueue >= escalationThresholdDays) {
        for (const approver of approvers) {
          const idempotencyKey = `esc_fdr_${fdr.id}_${approver.id}`
          const existingEsc = await prisma.notification.findFirst({
            where: {
              OR: [
                { idempotencyKey },
                {
                  fdrId: fdr.id,
                  type: 'ESCALATION',
                  thresholdDays: escalationThresholdDays,
                  userId: approver.id,
                },
              ],
            },
          })

          if (!existingEsc) {
            try {
              const title = 'Verification SLA Escalation Alert'
              const message = `Instrument ${fdr.referenceNumber} (${fdr.institution.name}) has been pending verification review for ${daysInQueue} days, exceeding regulatory SLA.`

              await prisma.notification.create({
                data: {
                  userId: approver.id,
                  fdrId: fdr.id,
                  type: 'ESCALATION',
                  thresholdDays: escalationThresholdDays,
                  title,
                  message,
                  urgency: 'HIGH',
                  idempotencyKey,
                },
              })
              escalationsCount++

              if (approver.email) {
                sendMail({
                  to: approver.email,
                  subject: `[AICTE Escalation] ${title}`,
                  text: message,
                }).catch(() => {})
              }
            } catch {
              // Already escalated
            }
          }
        }
      }
    }
  }

  // 4. Escalation for Release Stages past SLA
  const overdueStages = await prisma.releaseStage.findMany({
    where: {
      status: 'ACTIVE',
      dueAt: { lt: now },
    },
    include: {
      releaseRequest: {
        include: {
          fdr: { include: { institution: true } },
        },
      },
    },
  })

  for (const stage of overdueStages) {
    const overdueDays = Math.ceil((todayMs - new Date(stage.dueAt!).getTime()) / (1000 * 60 * 60 * 24))
    const rel = stage.releaseRequest

    for (const approver of approvers) {
      const idempotencyKey = `esc_stage_${stage.id}_${todayStr}_${approver.id}`
      const existingNotif = await prisma.notification.findUnique({
        where: { idempotencyKey },
      })

      if (!existingNotif) {
        try {
          const title = `Release Stage SLA Breach: ${stage.office}`
          const message = `Release request ${rel.id} for ${rel.fdr.referenceNumber} (${rel.fdr.institution.name}) is overdue at regulatory stage ${stage.office} by ${overdueDays} day(s). Action required immediately.`

          await prisma.notification.create({
            data: {
              userId: approver.id,
              fdrId: rel.fdrId,
              type: 'ESCALATION',
              title,
              message,
              urgency: 'URGENT',
              idempotencyKey,
            },
          })
          stageEscalationsCount++

          if (approver.email) {
            sendMail({
              to: approver.email,
              subject: `[AICTE SLA Breach] ${title}`,
              text: message,
            }).catch(() => {})
          }
        } catch {
          // Idempotency safety
        }
      }
    }
  }

  return {
    instrumentsChecked: fdrs.length,
    remindersGenerated,
    maturedCount,
    expiringCount,
    escalationsCount,
    stageEscalationsCount,
  }
}

// Start daily cron job
export function startMaturityCronJob() {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[CRON] Running daily statutory maturity and SLA check...')
      const stats = await runMaturityAndNotificationCheck()
      console.log('[CRON] Completed maturity job:', stats)
    } catch (err) {
      console.error('[CRON] Error in maturity cron job:', err)
    }
  })
}
