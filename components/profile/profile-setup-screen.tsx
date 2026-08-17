'use client'

import {useEffect,useState} from 'react'
import {ArrowLeft,Check,Cloud,LogOut} from 'lucide-react'
import ko from '@/lib/locales/ko.json'
import {authService} from '@/lib/supabase/auth-service'
import {completeUserProfile,getProfileCompletionStatus,validateRequiredProfile,type RequiredProfileInput,type ProfileValidation} from '@/lib/supabase/profile-completion-service'
import {ProfileAvatarManager} from './profile-avatar-manager'

const t=ko.profileSetup
const inputClass='mt-2 h-14 w-full rounded-2xl border border-border bg-card px-4 text-navy outline-none focus-visible:ring-2 focus-visible:ring-gold'
const empty:RequiredProfileInput={fullName:'',phone:'',birthDate:'',kakaoId:'',requiredTermsAgreed:false,privacyConsentAgreed:false,marketingConsent:false,smsNotificationConsent:false,kakaoContactConsent:false}

export function ProfileSetupScreen(){
  const[form,setForm]=useState<RequiredProfileInput>(empty)
  const[email,setEmail]=useState('')
  const[step,setStep]=useState<'form'|'review'|'under14'>('form')
  const[validation,setValidation]=useState<ProfileValidation>({valid:false,errors:{}})
  const[loading,setLoading]=useState(true)
  const[saving,setSaving]=useState(false)
  const[message,setMessage]=useState('')
  const returnTo=typeof window==='undefined'?'/':safeReturnTo(new URLSearchParams(window.location.search).get('returnTo'))
  const isEdit=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('edit')==='1'

  useEffect(()=>{void getProfileCompletionStatus().then(result=>{
    if(!result.authenticated){window.location.replace('/?auth=error&authError=session_exchange_failed');return}
    if(result.completed&&!isEdit){window.location.replace(returnTo);return}
    if(result.profile){setEmail(result.profile.email);setForm(current=>({...current,fullName:result.profile!.fullName,phone:result.profile!.phone,birthDate:result.profile!.birthDate,kakaoId:result.profile!.kakaoId,requiredTermsAgreed:Boolean(result.profile!.requiredTermsVersion),privacyConsentAgreed:Boolean(result.profile!.privacyConsentVersion),marketingConsent:result.profile!.marketingConsent,smsNotificationConsent:result.profile!.smsNotificationConsent,kakaoContactConsent:result.profile!.kakaoContactConsent}))}
    setLoading(false)
  })},[returnTo])

  const patch=<K extends keyof RequiredProfileInput>(key:K,value:RequiredProfileInput[K])=>setForm(current=>({...current,[key]:value}))
  const allAgreed=form.requiredTermsAgreed&&form.privacyConsentAgreed&&form.marketingConsent&&form.smsNotificationConsent&&form.kakaoContactConsent
  function review(){
    const result=validateRequiredProfile(form);setValidation(result)
    if(!result.valid){setMessage(t.validationError);return}
    setMessage('');setStep('review')
  }
  async function complete(){
    setSaving(true);setMessage('')
    const result=await completeUserProfile(form)
    setSaving(false)
    if(!result.ok){
      if('under14'in result&&result.under14){setStep('under14');return}
      setValidation(result.validation);setMessage(t.saveError);setStep('form');return
    }
    const destination=new URL(returnTo,window.location.origin)
    destination.searchParams.set('auth','success')
    destination.searchParams.set('profileCompleted','1')
    destination.searchParams.set('openAccount','1')
    window.location.replace(destination.toString())
  }
  async function logout(){await authService.signOut();window.location.replace('/')}

  if(loading)return <ProfileFrame><p role="status" className="py-20 text-center text-sm text-muted-foreground">{ko.account.restoring}</p></ProfileFrame>
  if(step==='under14')return <ProfileFrame><section className="mt-12 rounded-3xl border border-gold/30 bg-card p-6"><h1 className="text-2xl font-bold text-navy">{t.under14Title}</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">{t.under14Description}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{t.under14Pending}</p><a href="mailto:support@example.com" className="mt-6 flex h-12 items-center justify-center rounded-2xl border border-navy font-bold text-navy">{t.support}</a><button onClick={()=>void logout()} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy font-bold text-ivory"><LogOut className="h-4 w-4"/>{t.logout}</button></section></ProfileFrame>
  if(step==='review')return <ProfileFrame onBack={()=>setStep('form')}><h1 className="mt-8 text-3xl font-bold text-navy">{t.reviewTitle}</h1><div className="mt-8 space-y-3 rounded-3xl border border-border bg-card p-5">{[[t.email,email],[t.fullName,form.fullName],[t.phone,validation.normalizedPhone??form.phone],[t.birthDate,form.birthDate],[`${t.kakaoId} · ${t.optional}`,form.kakaoId||'-']].map(([label,value])=><div key={label} className="flex justify-between gap-4 border-b border-border/60 py-3 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><strong className="text-right text-sm text-navy">{value}</strong></div>)}</div><div className="mt-5 rounded-3xl bg-secondary/60 p-5 text-sm text-navy"><p><Check className="mr-2 inline h-4 w-4 text-gold"/>{t.terms} · {t.privacy}</p><p className="mt-2 text-muted-foreground">{t.optionalConsent}: {[form.marketingConsent&&t.marketing,form.smsNotificationConsent&&t.sms,form.kakaoContactConsent&&t.kakaoContact].filter(Boolean).join(' · ')||'-'}</p></div><button aria-busy={saving} disabled={saving} onClick={()=>void complete()} className="mt-8 h-14 w-full rounded-2xl bg-navy font-bold text-ivory disabled:opacity-45">{saving?t.saving:t.complete}</button><p className="sr-only" aria-live="polite">{saving?t.saving:''}</p></ProfileFrame>

  return <ProfileFrame>
    <h1 className="mt-8 text-3xl font-bold tracking-tight text-navy">{isEdit?t.edit:t.title}</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.description}</p>
    <div className="mt-6"><ProfileAvatarManager name={form.fullName}/></div>
    <form className="mt-8 space-y-7 pb-[calc(env(safe-area-inset-bottom)+2rem)]" onSubmit={event=>{event.preventDefault();review()}}>
      <section aria-labelledby="required-info"><h2 id="required-info" className="text-lg font-bold text-navy">{t.requiredInfo}</h2><div className="mt-4 space-y-4">
        <label className="block text-sm font-semibold text-navy">{t.email}<input value={email} readOnly aria-readonly="true" className={`${inputClass} bg-secondary/50 text-muted-foreground`}/><span className="mt-1 block text-xs font-normal text-muted-foreground">{t.emailReadonly}</span></label>
        <Field label={t.fullName} error={validation.errors.fullName}><input aria-required="true" aria-invalid={Boolean(validation.errors.fullName)} value={form.fullName} onChange={event=>patch('fullName',event.target.value)} className={inputClass}/></Field>
        <Field label={t.phone} help={t.phoneHelp} error={validation.errors.phone}><input aria-required="true" inputMode="tel" aria-invalid={Boolean(validation.errors.phone)} value={form.phone} onChange={event=>patch('phone',event.target.value)} className={inputClass}/></Field>
        <Field label={t.birthDate} help={t.ageExclusion} error={validation.errors.birthDate}><input aria-required="true" type="date" min="1900-01-01" max={new Date().toISOString().slice(0,10)} aria-invalid={Boolean(validation.errors.birthDate)} value={form.birthDate} onChange={event=>patch('birthDate',event.target.value)} className={inputClass}/></Field>
      </div></section>
      <section aria-labelledby="optional-info"><h2 id="optional-info" className="text-lg font-bold text-navy">{t.optionalInfo}</h2><label className="mt-4 block text-sm font-semibold text-navy">{t.kakaoId} <span className="text-xs font-normal text-muted-foreground">({t.optional})</span><input value={form.kakaoId} onChange={event=>patch('kakaoId',event.target.value)} className={inputClass}/><span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{t.kakaoHelp}</span></label></section>
      <section aria-labelledby="consent-title"><h2 id="consent-title" className="text-lg font-bold text-navy">{t.requiredConsent}</h2><Consent checked={allAgreed} onChange={value=>setForm(current=>({...current,requiredTermsAgreed:value,privacyConsentAgreed:value,marketingConsent:value,smsNotificationConsent:value,kakaoContactConsent:value}))} label={t.allAgree}/><div className="mt-3 space-y-2"><Consent checked={form.requiredTermsAgreed} onChange={value=>patch('requiredTermsAgreed',value)} label={`${t.terms} · ${t.requiredConsent}`} details={t.termsSummary} error={validation.errors.requiredTerms}/><Consent checked={form.privacyConsentAgreed} onChange={value=>patch('privacyConsentAgreed',value)} label={`${t.privacy} · ${t.requiredConsent}`} details={t.privacySummary} error={validation.errors.privacyConsent}/></div><h3 className="mt-6 font-bold text-navy">{t.optionalConsent}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{t.optionalSummary}</p><div className="mt-3 space-y-2"><Consent checked={form.marketingConsent} onChange={value=>patch('marketingConsent',value)} label={`${t.marketing} · ${t.optional}`}/><Consent checked={form.smsNotificationConsent} onChange={value=>patch('smsNotificationConsent',value)} label={`${t.sms} · ${t.optional}`}/><Consent checked={form.kakaoContactConsent} onChange={value=>patch('kakaoContactConsent',value)} label={`${t.kakaoContact} · ${t.optional}`}/></div></section>
      {message&&<p role="alert" className="rounded-2xl bg-coral/10 p-4 text-sm text-coral">{message}</p>}
      <button className="h-14 w-full rounded-2xl bg-navy font-bold text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">{t.reviewTitle}</button>
    </form>
  </ProfileFrame>
}

const safeReturnTo=(value:string|null)=>value?.startsWith('/')&&!value.startsWith('//')?value:'/'
function ProfileFrame({children,onBack}:{children:React.ReactNode;onBack?:()=>void}){return <div className="min-h-dvh bg-navy md:p-6"><main className="mx-auto min-h-dvh w-full max-w-[420px] overflow-y-auto bg-background px-6 pb-10 pt-[calc(env(safe-area-inset-top)+1.5rem)] md:min-h-[calc(100dvh-3rem)] md:rounded-[2.25rem] md:border md:border-white/10">{onBack?<button aria-label="이전" onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-5 w-5"/></button>:<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-gold"><Cloud/></div>}{children}</main></div>}
function Field({label,help,error,children}:{label:string;help?:string;error?:string;children:React.ReactNode}){return <label className="block text-sm font-semibold text-navy">{label}{children}{help&&<span className="mt-1 block text-xs font-normal text-muted-foreground">{help}</span>}{error&&<span role="alert" className="mt-1 block text-xs font-normal text-coral">{error}</span>}</label>}
function Consent({checked,onChange,label,details,error}:{checked:boolean;onChange:(value:boolean)=>void;label:string;details?:string;error?:string}){return <div className="rounded-2xl border border-border bg-card p-4"><label className="flex min-h-7 cursor-pointer items-start gap-3 text-sm font-semibold text-navy"><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)} className="mt-0.5 h-5 w-5 accent-navy"/><span>{label}</span></label>{details&&<details className="ml-8 mt-2 text-xs leading-5 text-muted-foreground"><summary className="cursor-pointer font-semibold">{t.details}</summary><p className="mt-2">{details}</p></details>}{error&&<p role="alert" className="ml-8 mt-2 text-xs text-coral">{error}</p>}</div>}
