export type StorageAreaName = 'local' | 'sync'

export {
  AI_CONFIG_STORAGE_KEY,
  getAIProviderConfig,
  saveAIProviderConfig,
} from './aiConfigStorage'
export {
  getResumeProfile,
  RESUME_PROFILE_STORAGE_KEY,
  saveResumeProfile,
} from './resumeProfileStorage'
