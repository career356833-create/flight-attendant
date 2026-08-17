import {getSupabaseBrowserClient} from './client'
import ko from '@/lib/locales/ko.json'

export const REQUIRED_TERMS_VERSION='2026-07-26'
export const PRIVACY_CONSENT_VERSION='2026-07-26'

export type UserProfile={
  id:string
  email:string
  fullName:string
  phone:string
  birthDate:string
  kakaoId:string
  avatarPath:string
  avatarUrl:string
  profileCompleted:boolean
  requiredTermsVersion:string|null
  privacyConsentVersion:string|null
  marketingConsent:boolean
  smsNotificationConsent:boolean
  kakaoContactConsent:boolean
  isUnder14:boolean
}
export type RequiredProfileInput={
  fullName:string
  phone:string
  birthDate:string
  kakaoId?:string
  requiredTermsAgreed:boolean
  privacyConsentAgreed:boolean
  marketingConsent:boolean
  smsNotificationConsent:boolean
  kakaoContactConsent:boolean
}
export type ProfileValidation={valid:boolean;errors:Partial<Record<'fullName'|'phone'|'birthDate'|'requiredTerms'|'privacyConsent',string>>;normalizedPhone?:string;isUnder14?:boolean}

const normalizePhone=(value:string)=>value.trim().replace(/[\s()-]/g,'')
export function calculateUnder14(birthDate:string,today=new Date()){
  const birth=new Date(`${birthDate}T00:00:00`)
  if(Number.isNaN(birth.getTime()))return false
  let age=today.getFullYear()-birth.getFullYear()
  const beforeBirthday=today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate())
  if(beforeBirthday)age--
  return age<14
}
export function validateRequiredProfile(input:RequiredProfileInput):ProfileValidation{
  const errors:ProfileValidation['errors']={}
  const phone=normalizePhone(input.phone)
  if(input.fullName.trim().length<2)errors.fullName=ko.profileSetup.nameInvalid
  if(!/^\+?[0-9]{7,15}$/.test(phone))errors.phone=ko.profileSetup.phoneInvalid
  const birth=new Date(`${input.birthDate}T00:00:00`),earliest=new Date('1900-01-01T00:00:00'),today=new Date()
  if(!input.birthDate||Number.isNaN(birth.getTime())||birth<earliest||birth>today)errors.birthDate=ko.profileSetup.birthDateInvalid
  if(!input.requiredTermsAgreed)errors.requiredTerms=ko.profileSetup.termsRequired
  if(!input.privacyConsentAgreed)errors.privacyConsent=ko.profileSetup.privacyRequired
  return{valid:Object.keys(errors).length===0,errors,normalizedPhone:phone,isUnder14:input.birthDate?calculateUnder14(input.birthDate):false}
}
const mapProfile=(row:Record<string,unknown>,email:string):UserProfile=>({
  id:String(row.id),email,fullName:String(row.full_name??row.display_name??''),phone:String(row.phone??''),birthDate:String(row.birth_date??''),kakaoId:String(row.kakao_id??''),avatarPath:String(row.avatar_path??''),avatarUrl:String(row.avatar_url??''),profileCompleted:Boolean(row.profile_completed),requiredTermsVersion:row.required_terms_version?String(row.required_terms_version):null,privacyConsentVersion:row.privacy_consent_version?String(row.privacy_consent_version):null,marketingConsent:Boolean(row.marketing_consent),smsNotificationConsent:Boolean(row.sms_notification_consent),kakaoContactConsent:Boolean(row.kakao_contact_consent),isUnder14:Boolean(row.is_under_14),
})
export async function getProfileCompletionStatus(){
  const client=getSupabaseBrowserClient();if(!client)return{authenticated:false,completed:false as const}
  const{data:{user}}=await client.auth.getUser();if(!user)return{authenticated:false,completed:false as const}
  const{data,error}=await client.from('profiles').select('*').eq('id',user.id).maybeSingle()
  return{authenticated:true,completed:Boolean(data?.profile_completed),profile:data?mapProfile(data as Record<string,unknown>,user.email??''):undefined,error:error?.message}
}
export async function completeUserProfile(input:RequiredProfileInput){
  const validation=validateRequiredProfile(input)
  if(!validation.valid)return{ok:false as const,validation}
  const client=getSupabaseBrowserClient();if(!client)return{ok:false as const,error:'not_configured',validation}
  const{data:{user}}=await client.auth.getUser();if(!user)return{ok:false as const,error:'not_authenticated',validation}
  const now=new Date().toISOString()
  const payload={full_name:input.fullName.trim(),display_name:input.fullName.trim(),phone:validation.normalizedPhone!,birth_date:input.birthDate,kakao_id:input.kakaoId?.trim()||null,profile_completed:!validation.isUnder14,required_terms_version:REQUIRED_TERMS_VERSION,privacy_consent_version:PRIVACY_CONSENT_VERSION,required_terms_agreed_at:now,privacy_consent_agreed_at:now,marketing_consent:input.marketingConsent,marketing_consent_at:input.marketingConsent?now:null,sms_notification_consent:input.smsNotificationConsent,sms_notification_consent_at:input.smsNotificationConsent?now:null,kakao_contact_consent:input.kakaoContactConsent,kakao_contact_consent_at:input.kakaoContactConsent?now:null,age_verified_at:now,is_under_14:Boolean(validation.isUnder14),phone_verified:false,phone_verified_at:null}
  const{error}=await client.from('profiles').update(payload as never).eq('id',user.id)
  if(!error&&validation.isUnder14)return{ok:false as const,under14:true as const,validation}
  return error?{ok:false as const,error:error.message,validation}:{ok:true as const,validation}
}
export async function updateUserProfile(input:RequiredProfileInput){return completeUserProfile(input)}
export async function getProfileConsents(){return(await getProfileCompletionStatus()).profile}
export async function updateOptionalConsents(value:Pick<RequiredProfileInput,'marketingConsent'|'smsNotificationConsent'|'kakaoContactConsent'>){
  const client=getSupabaseBrowserClient();if(!client)return{ok:false}
  const{data:{user}}=await client.auth.getUser();if(!user)return{ok:false}
  const now=new Date().toISOString()
  const{error}=await client.from('profiles').update({marketing_consent:value.marketingConsent,marketing_consent_at:value.marketingConsent?now:null,sms_notification_consent:value.smsNotificationConsent,sms_notification_consent_at:value.smsNotificationConsent?now:null,kakao_contact_consent:value.kakaoContactConsent,kakao_contact_consent_at:value.kakaoContactConsent?now:null} as never).eq('id',user.id)
  return{ok:!error,error:error?.message}
}
export const ensureProfileCompletion=getProfileCompletionStatus
