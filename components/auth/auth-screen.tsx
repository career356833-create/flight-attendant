'use client'

import {useEffect,useState} from 'react'
import {ArrowLeft,Cloud,LockKeyhole,Mail} from 'lucide-react'
import {authService} from '@/lib/supabase/auth-service'
import {getSupabaseRuntimeConfig} from '@/lib/supabase/config'
import ko from '@/lib/locales/ko.json'

type Mode='welcome'|'signin'|'signup'|'forgot'|'reset'|'verification'
type OAuthErrorCode='popup_closed_by_user'|'access_denied'|'oauth_callback_error'|'provider_not_enabled'|'network_error'|'session_exchange_failed'

const oauthMessages:Record<OAuthErrorCode,string>={
  popup_closed_by_user:ko.account.oauth.cancelled,
  access_denied:ko.account.oauth.cancelled,
  oauth_callback_error:ko.account.oauth.failed,
  provider_not_enabled:ko.account.oauth.failed,
  network_error:ko.account.oauth.failed,
  session_exchange_failed:ko.account.oauth.sessionFailed,
}
const oauthMessage=(code?:string)=>oauthMessages[code as OAuthErrorCode]??ko.account.oauth.failed

function GoogleIcon(){
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.32 2.98-7.39Z"/>
    <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"/>
    <path fill="#FBBC05" d="M6.39 13.92A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.53l3.35-2.61Z"/>
    <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z"/>
  </svg>
}

export function AuthScreen({onBack,onAuthenticated,initialOAuthError}:{onBack:()=>void;onAuthenticated:()=>void;initialOAuthError?:string}){
  const[mode,setMode]=useState<Mode>(initialOAuthError?'signin':'welcome')
  const[email,setEmail]=useState('')
  const[password,setPassword]=useState('')
  const[busy,setBusy]=useState(false)
  const[googleBusy,setGoogleBusy]=useState(false)
  const[message,setMessage]=useState(initialOAuthError?oauthMessage(initialOAuthError):'')
  const configured=getSupabaseRuntimeConfig().configured
  const fields=['signin','signup','forgot','reset'].includes(mode)

  useEffect(()=>{
    if(!initialOAuthError)return
    setMode('signin')
    setMessage(oauthMessage(initialOAuthError))
  },[initialOAuthError])

  async function submit(){
    setBusy(true);setMessage('')
    const result=mode==='signin'?await authService.signIn(email,password):mode==='signup'?await authService.signUp(email,password):mode==='forgot'?await authService.requestPasswordReset(email):await authService.updatePassword(password)
    setBusy(false)
    if(!result.ok){setMessage(result.message??'요청을 처리하지 못했어요.');return}
    if(mode==='signup'&&result.verificationPending){setMode('verification');return}
    if(mode==='forgot'){setMessage('비밀번호 재설정 링크를 이메일로 보냈어요.');return}
    onAuthenticated()
  }

  async function continueWithGoogle(){
    setGoogleBusy(true);setMessage('')
    const result=await authService.signInWithGoogle()
    if(!result.ok){setGoogleBusy(false);setMessage(oauthMessage(result.message))}
  }

  return <div className="grid h-full bg-background md:grid-cols-[minmax(0,1fr)_minmax(420px,480px)]">
    <aside className="relative hidden overflow-hidden bg-navy p-12 text-ivory md:flex md:flex-col md:justify-between" aria-label="CABIN 소개">
      <div className="absolute -right-24 top-1/2 h-[420px] w-[300px] -translate-y-1/2 rounded-[48%] border border-white/15 bg-gradient-to-br from-sky/20 via-white/5 to-transparent shadow-[inset_0_0_70px_rgba(220,230,236,0.12)]" aria-hidden="true"/>
      <div className="relative"><span className="text-xs font-bold tracking-[0.2em] text-gold">CABIN</span><p className="mt-3 text-xl font-bold">Cabin Career Coach</p></div>
      <div className="relative max-w-xl"><p className="text-4xl font-bold leading-tight">준비한 경험이<br/>면접의 자신감이 되도록.</p><p className="mt-5 max-w-md text-base leading-7 text-ivory/65">면접, 자기소개, 지원서를 하나의 준비 흐름으로 연결합니다.</p></div>
      <p className="relative text-xs text-ivory/45">LOCAL-FIRST ACCOUNT SYNC</p>
    </aside>
    <section className="flex min-h-0 flex-col bg-background">
    <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.4rem)]">
      <button onClick={onBack} aria-label="뒤로" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-5 w-5"/></button>
      <span className="eyebrow text-muted-foreground">ACCOUNT ACCESS</span>
    </header>
    <main className="flex-1 overflow-y-auto px-6 pb-10 pt-10 md:px-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-gold"><Cloud/></div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-navy">{mode==='welcome'?'계정 연결을 선택하세요':mode==='signin'?'로그인':mode==='signup'?'회원가입':mode==='forgot'?'비밀번호 찾기':mode==='reset'?'새 비밀번호 설정':'이메일을 확인해 주세요'}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode==='welcome'?'지금 기기의 기록은 그대로 유지됩니다. 로그인 후 지원되는 항목의 계정 동기화를 선택할 수 있으며, 일부 기록과 음성은 이 기기에만 남습니다.':mode==='verification'?`${email}로 인증 링크를 보냈어요. 인증한 뒤 로그인해 주세요.`:'이메일과 비밀번호 인증에는 Supabase Auth를 사용합니다.'}</p>
      {!configured&&<div className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm leading-6 text-navy"><strong>현재는 로컬 저장 모드예요.</strong><br/>계정 동기화 설정 전에도 이 기기에서 지원되는 준비 기능과 기록을 계속 사용할 수 있어요.</div>}

      {mode==='signin'&&<div className="mt-8">
        <button
          type="button"
          aria-label={ko.account.oauth.continueWithGoogle}
          aria-busy={googleBusy}
          disabled={googleBusy||busy||!configured}
          onClick={()=>void continueWithGoogle()}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white px-4 font-bold text-navy transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <GoogleIcon/>
          <span>{googleBusy?ko.account.oauth.redirecting:ko.account.oauth.continueWithGoogle}</span>
        </button>
        <p className="sr-only" aria-live="polite">{googleBusy?ko.account.oauth.redirecting:''}</p>
        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border"/>
          <span className="text-xs text-muted-foreground">{ko.account.oauth.or}</span>
          <span className="h-px flex-1 bg-border"/>
        </div>
      </div>}

      {fields&&<form className={mode==='signin'?'space-y-4':'mt-8 space-y-4'} onSubmit={event=>{event.preventDefault();void submit()}}>
        {mode!=='reset'&&<label className="block"><span className="mb-2 block text-sm font-semibold text-navy">이메일</span><span className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4"><Mail className="h-4 w-4 text-muted-foreground"/><input required type="email" value={email} onChange={event=>setEmail(event.target.value)} className="h-14 min-w-0 flex-1 bg-transparent outline-none" placeholder="name@example.com"/></span></label>}
        {!['forgot'].includes(mode)&&<label className="block"><span className="mb-2 block text-sm font-semibold text-navy">비밀번호</span><span className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4"><LockKeyhole className="h-4 w-4 text-muted-foreground"/><input required minLength={8} type="password" value={password} onChange={event=>setPassword(event.target.value)} className="h-14 min-w-0 flex-1 bg-transparent outline-none" placeholder="8자 이상"/></span></label>}
        <button disabled={busy||googleBusy||!configured} className="h-14 w-full rounded-2xl bg-navy font-bold text-ivory disabled:opacity-45">{busy?'처리 중…':mode==='signin'?'로그인':mode==='signup'?'회원가입':mode==='forgot'?'재설정 이메일 보내기':'비밀번호 변경'}</button>
      </form>}
      {message&&<p role="status" className="mt-4 rounded-xl bg-secondary p-3 text-sm text-navy">{message}</p>}
      {mode==='welcome'&&<div className="mt-8 space-y-3"><button onClick={()=>setMode('signin')} disabled={!configured} className="h-14 w-full rounded-2xl bg-navy font-bold text-ivory disabled:opacity-45">로그인</button><button onClick={()=>setMode('signup')} disabled={!configured} className="h-14 w-full rounded-2xl border border-navy font-bold text-navy disabled:opacity-45">회원가입</button><button onClick={onBack} className="h-12 w-full text-sm font-semibold text-muted-foreground">이 기기에만 저장하며 계속하기</button></div>}
      {mode==='signin'&&<div className="mt-5 flex justify-between text-sm"><button onClick={()=>setMode('signup')} className="font-semibold text-navy">회원가입</button><button onClick={()=>setMode('forgot')} className="text-muted-foreground">비밀번호 찾기</button></div>}
      {mode==='verification'&&<button onClick={()=>setMode('signin')} className="mt-8 h-14 w-full rounded-2xl bg-navy font-bold text-ivory">로그인으로 돌아가기</button>}
    </main>
    </section>
  </div>
}
