import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Official portal email is required')
    .email('Please enter a valid institution or AICTE official email address'),
  password: z
    .string()
    .min(6, 'Password must contain at least 6 characters'),
  rememberSession: z.boolean().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerInstitutionSchema = z.object({
  institutionCode: z
    .string()
    .min(3, 'AICTE Permanent ID is required (e.g. 1-10023412)'),
  institutionName: z
    .string()
    .min(3, 'Official institution name is required'),
  principalName: z
    .string()
    .min(3, 'Authorized signatory or Principal name is required'),
  email: z
    .string()
    .min(1, 'Official institutional email is required')
    .email('Please enter a valid official institutional email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  state: z.string().min(2, 'State is required'),
  city: z.string().min(2, 'City is required'),
  type: z.string().default('Government'),
  contactPhone: z.string().optional(),
})

export type RegisterInstitutionFormData = z.infer<typeof registerInstitutionSchema>
