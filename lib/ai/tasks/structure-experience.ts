export const structureExperienceTask=(...args:Parameters<typeof import('../ai-service').aiService.structureExperience>)=>import('../ai-service').then(x=>x.aiService.structureExperience(...args))
