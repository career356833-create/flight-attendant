export const generateCoachMessageTask=(...args:Parameters<typeof import('../ai-service').aiService.generateCoachMessage>)=>import('../ai-service').then(x=>x.aiService.generateCoachMessage(...args))
