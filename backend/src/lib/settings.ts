import { prisma } from './prisma'

interface CacheEntry {
  value: unknown
  expiresAt: number
}

const settingsCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30 * 1000 // 30 seconds

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const cached = settingsCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T
  }

  try {
    const row = await prisma.setting.findUnique({ where: { key } })
    if (!row) {
      return defaultValue
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(row.value)
    } catch {
      parsed = row.value
    }

    settingsCache.set(key, { value: parsed, expiresAt: Date.now() + CACHE_TTL_MS })
    return parsed as T
  } catch {
    return defaultValue
  }
}

export async function setSetting(
  key: string,
  value: unknown,
  description?: string,
  updatedById?: string
): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)

  await prisma.setting.upsert({
    where: { key },
    update: {
      value: serialized,
      description,
      updatedById,
      updatedAt: new Date(),
    },
    create: {
      key,
      value: serialized,
      description,
      isSample: true,
      updatedById,
    },
  })

  // Invalidate cache
  settingsCache.delete(key)
}

export function invalidateSettingCache(key?: string) {
  if (key) {
    settingsCache.delete(key)
  } else {
    settingsCache.clear()
  }
}
