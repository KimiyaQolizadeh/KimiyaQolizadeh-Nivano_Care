const TORONTO_TIME_ZONE = 'America/Toronto'

function toDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTimeET(value?: string | null) {
  const date = toDate(value)
  if (!date) return 'Not available'

  return new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatDateET(value?: string | null) {
  const date = toDate(value)
  if (!date) return 'Not available'

  return new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatTimeET(value?: string | null) {
  const date = toDate(value)
  if (!date) return 'Not available'

  return new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatDateRangeET(start?: string | null, end?: string | null) {
  const startDate = toDate(start)
  const endDate = toDate(end)
  if (!startDate || !endDate) return 'Not available'

  const startLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(startDate)
  const endLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(endDate)

  return `${startLabel} - ${endLabel}`
}

export function formatCompactDateTime(value?: string | null) {
  const date = toDate(value)
  if (!date) return 'Not available'

  const currentYear = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    year: 'numeric',
  }).format(new Date())
  const valueYear = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    year: 'numeric',
  }).format(date)

  return new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    ...(valueYear !== currentYear ? { year: 'numeric' as const } : {}),
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatCompactDate(value?: string | null) {
  const date = toDate(value)
  if (!date) return 'Not available'

  const currentYear = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    year: 'numeric',
  }).format(new Date())
  const valueYear = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    year: 'numeric',
  }).format(date)

  return new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    ...(valueYear !== currentYear ? { year: 'numeric' as const } : {}),
  }).format(date)
}

export function formatCompactTimeRange(start?: string | null, end?: string | null) {
  const startDate = toDate(start)
  const endDate = toDate(end)
  if (!startDate || !endDate) return 'Not available'

  const startLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(startDate)
  const endLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(endDate)

  return `${startLabel} - ${endLabel}`
}

export function formatCompactDateRange(start?: string | null, end?: string | null) {
  const startDate = toDate(start)
  const endDate = toDate(end)
  if (!startDate || !endDate) return 'Not available'

  const currentYear = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    year: 'numeric',
  }).format(new Date())
  const valueYear = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    year: 'numeric',
  }).format(startDate)

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    ...(valueYear !== currentYear ? { year: 'numeric' as const } : {}),
  }).format(startDate)
  const startLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(startDate)
  const endLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TORONTO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(endDate)

  return `${dateLabel}, ${startLabel} - ${endLabel}`
}
