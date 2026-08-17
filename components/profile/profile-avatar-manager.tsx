'use client'

import {useEffect,useRef,useState} from 'react'
import {Camera,Trash2,UserRound} from 'lucide-react'
import ko from '@/lib/locales/ko.json'
import {getProfileCompletionStatus} from '@/lib/supabase/profile-completion-service'
import {deleteProfileAvatar,processProfileImage,revokeProfileImagePreview,replaceProfileImage,resolveDisplayedAvatar,type DisplayAvatar,type ProcessedProfileImage,useGoogleAvatar,validateProfileImage} from '@/lib/supabase/profile-image-service'

const t=ko.profileImage
const fallback:DisplayAvatar={kind:'initials',initials:'?'}

export function ProfileAvatarManager({name,showDescription=true}:{name?:string;showDescription?:boolean}){
  const[fileInput,setFileInput]=useState<HTMLInputElement|null>(null)
  const[avatar,setAvatar]=useState<DisplayAvatar>(fallback)
  const[pending,setPending]=useState<ProcessedProfileImage>()
  const[busy,setBusy]=useState(false)
  const[error,setError]=useState('')
  const currentName=useRef(name)
  currentName.current=name??currentName.current

  async function refresh(){
    const status=await getProfileCompletionStatus()
    if(!status.profile)return
    setAvatar(await resolveDisplayedAvatar({avatarPath:status.profile.avatarPath,avatarUrl:status.profile.avatarUrl,name:currentName.current??status.profile.fullName}))
  }
  useEffect(()=>{void refresh()},[])
  useEffect(()=>()=>revokeProfileImagePreview(pending?.previewUrl),[pending])

  async function choose(file?:File){
    if(!file)return
    setError('')
    const validation=validateProfileImage(file)
    if(!validation.ok){setError(validation.code==='unsupported_type'?t.unsupportedType:t.tooLarge);return}
    try{
      const next=await processProfileImage(file)
      if(pending)revokeProfileImagePreview(pending.previewUrl)
      setPending(next)
    }catch{setError(t.processingFailed)}
  }
  function cancel(){if(pending)revokeProfileImagePreview(pending.previewUrl);setPending(undefined);setError('')}
  async function apply(){
    if(!pending)return
    setBusy(true);setError('')
    try{await replaceProfileImage(pending.blob);cancel();await refresh()}catch{setError(t.saveFailed)}finally{setBusy(false)}
  }
  async function restoreGoogle(){
    setBusy(true);setError('')
    try{await useGoogleAvatar();await refresh()}catch{setError(t.deleteFailed)}finally{setBusy(false)}
  }
  async function remove(){
    setBusy(true);setError('')
    try{await deleteProfileAvatar();await refresh()}catch{setError(t.deleteFailed)}finally{setBusy(false)}
  }
  const imageUrl=pending?.previewUrl??avatar.url
  const alt=avatar.kind==='google'?t.googleAlt:avatar.kind==='uploaded'?t.imageAlt:t.initialsAlt

  return <section className="rounded-3xl border border-border bg-card p-5" aria-labelledby="profile-image-title">
    <div className="flex items-start gap-4"><AvatarVisual url={imageUrl} initials={avatar.initials} alt={alt} onImageError={()=>void refresh()}/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 id="profile-image-title" className="font-bold text-navy">{t.title}</h2><span className="text-xs text-muted-foreground">{t.optional}</span></div>{showDescription&&<p className="mt-1 text-xs leading-5 text-muted-foreground">{t.description}</p>}</div></div>
    {pending?<div className="mt-4"><p className="text-xs font-semibold text-navy">{t.preview} · {pending.width}×{pending.height}</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>fileInput?.click()} disabled={busy} className="h-11 rounded-xl border border-border text-sm font-bold text-navy">{t.chooseAgain}</button><button type="button" onClick={()=>void apply()} disabled={busy} aria-busy={busy} className="h-11 rounded-xl bg-navy text-sm font-bold text-ivory disabled:opacity-45">{busy?t.uploading:t.apply}</button><button type="button" onClick={cancel} disabled={busy} className="col-span-2 h-10 text-sm text-muted-foreground">{t.cancel}</button></div></div>:<div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={()=>fileInput?.click()} disabled={busy} aria-label={avatar.kind==='uploaded'?t.change:t.choose} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-navy disabled:opacity-45"><Camera aria-hidden="true" className="h-4 w-4"/>{avatar.kind==='uploaded'?t.change:t.choose}</button><button type="button" onClick={()=>void restoreGoogle()} disabled={busy} className="h-11 rounded-xl border border-border text-sm font-bold text-navy disabled:opacity-45">{t.useGoogle}</button><button type="button" onClick={()=>void remove()} disabled={busy||avatar.kind!=='uploaded'} aria-label={t.delete} className="col-span-2 flex h-10 items-center justify-center gap-2 text-sm text-muted-foreground disabled:opacity-40"><Trash2 aria-hidden="true" className="h-4 w-4"/>{t.delete}</button>{showDescription&&<button type="button" onClick={cancel} disabled={busy} className="col-span-2 h-10 text-sm text-muted-foreground disabled:opacity-40">{t.continueWithout}</button>}</div>}
    <input ref={setFileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t.choose} onChange={event=>{void choose(event.target.files?.[0]);event.currentTarget.value=''}}/>
    <p className="sr-only" aria-live="polite">{busy?t.uploading:''}</p>{error&&<p role="alert" className="mt-3 text-xs text-coral">{error}</p>}
  </section>
}

function AvatarVisual({url,initials,alt,onImageError}:{url?:string;initials:string;alt:string;onImageError:()=>void}){return <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xl font-bold text-navy">{url?<img src={url} alt={alt} onError={onImageError} className="h-full w-full object-cover"/>:<><UserRound aria-hidden="true" className="h-5 w-5"/><span className="sr-only">{alt}</span><span aria-hidden="true">{initials}</span></>}</div>}
