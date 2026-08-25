async function save() {
  'use server'
  return null
}

export const runtime = 'nodejs'
export const maxDuration = 30

export default function SettingsPage() {
  return save
}
