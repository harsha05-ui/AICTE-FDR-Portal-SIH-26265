export function validateFileMagicBytes(buffer: Buffer): {
  isValid: boolean
  detectedType?: string
} {
  if (buffer.length < 4) {
    return { isValid: false }
  }

  // PDF magic bytes: 25 50 44 46 (%PDF)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { isValid: true, detectedType: 'application/pdf' }
  }

  // PNG magic bytes: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { isValid: true, detectedType: 'image/png' }
  }

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedType: 'image/jpeg' }
  }

  return { isValid: false }
}
