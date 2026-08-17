import fs from 'node:fs'

const files=[
  'lib/ai/types.ts',
  'lib/interview-practice-data.ts',
  'lib/learning-analytics.ts',
  'lib/onboarding-data.ts',
].filter(file=>fs.existsSync(file))
const forbidden=/\b(age|birthDate|birth_date|dateOfBirth|dob|avatar|avatarUrl|avatar_url|avatarPath|avatar_path|profileImage|profile_image|photo|picture)\s*[?:]/i
const errors=[]
for(const file of files){
  const text=fs.readFileSync(file,'utf8')
  if(forbidden.test(text))errors.push(`${file}: age-related context field found`)
}
const profileFiles=['components/profile/profile-avatar-manager.tsx','lib/supabase/profile-image-service.ts']
for(const file of profileFiles){
  const text=fs.readFileSync(file,'utf8')
  if(/localStorage\.(getItem|setItem)|data:image\//.test(text))errors.push(`${file}: profile image must not be persisted locally`)
}
const storageMigration=fs.readFileSync('supabase/migrations/0007_private_profile_images.sql','utf8')
if(!storageMigration.includes("'cabin-profile-images',false"))errors.push('profile image bucket must be private')
if(!storageMigration.includes("(storage.foldername(name))[1]=auth.uid()::text"))errors.push('profile image ownership RLS is missing')
const locales=['lib/locales/ko.json','lib/locales/en.json'].map(file=>JSON.parse(fs.readFileSync(file,'utf8')))
const flatten=(value,prefix='')=>Object.entries(value).flatMap(([key,child])=>child&&typeof child==='object'&&!Array.isArray(child)?flatten(child,prefix?`${prefix}.${key}`:key):[prefix?`${prefix}.${key}`:key])
const[keysA,keysB]=locales.map(value=>new Set(flatten(value)))
for(const key of keysA)if(!keysB.has(key))errors.push(`en locale missing ${key}`)
for(const key of keysB)if(!keysA.has(key))errors.push(`ko locale missing ${key}`)
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Profile privacy OK: ${files.length} contexts inspected, ${keysA.size} mirrored locale keys.`)
