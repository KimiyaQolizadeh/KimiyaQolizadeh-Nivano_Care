export function formatClinicalRole(value?: string | null) {
  const text = (value || '').trim()
  const normalized = text.toLowerCase()

  if (!text) return 'Clinical role'
  if (normalized === 'rn' || normalized === 'registered nurse') return 'Registered Nurse (RN)'
  if (normalized === 'rpn' || normalized === 'registered practical nurse') return 'Registered Practical Nurse (RPN)'
  if (normalized === 'psw' || normalized === 'personal support worker') return 'Personal Support Worker (PSW)'

  return text
}

export function getFriendlyApiError(errorMessage: string, fallback = 'We couldn’t complete that action. Please try again.') {
  const message = errorMessage.trim()

  if (!message) return fallback
  if (/account approval required/i.test(message)) {
    return 'Your account is pending approval. Applications open after administrator approval.'
  }
  if (/profile/i.test(message) && /required|missing|not found/i.test(message)) {
    return 'Add your professional profile before applying.'
  }
  if (/credential/i.test(message) && /required|missing|pending/i.test(message)) {
    return 'Submit credentials for review before shift confirmation.'
  }
  if (/withdraw/i.test(message) && /approved|confirmed|completed/i.test(message)) {
    return 'This application can no longer be withdrawn because coverage has already been confirmed.'
  }

  return message
}
