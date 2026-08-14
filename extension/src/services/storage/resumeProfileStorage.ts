import type { ResumeProfile } from '../../agents'

export const RESUME_PROFILE_STORAGE_KEY = 'resumeProfile'

export async function getResumeProfile() {
  const result = await chrome.storage.local.get(RESUME_PROFILE_STORAGE_KEY)

  return result[RESUME_PROFILE_STORAGE_KEY] as ResumeProfile | undefined
}

export async function saveResumeProfile(profile: ResumeProfile) {
  await chrome.storage.local.set({
    [RESUME_PROFILE_STORAGE_KEY]: profile,
  })
}
