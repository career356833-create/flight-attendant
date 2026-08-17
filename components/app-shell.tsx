'use client'

import { useEffect, useState } from 'react'
import { VideoLanding } from '@/components/video-landing'
import { HomeDashboard } from '@/components/home-dashboard'
import { cn } from '@/lib/utils'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { clearOnboarding, emptyAnswers, loadOnboarding, saveOnboarding, type DiagnosisResult, type OnboardingAnswers } from '@/lib/onboarding-data'
import { AirlineKnowledgeAdmin } from '@/components/admin/airline-knowledge-admin'
import { AiSettingsAdmin } from '@/components/admin/ai-settings-admin'
import { AuthScreen } from '@/components/auth/auth-screen'
import { authService } from '@/lib/supabase/auth-service'
import { ensureUserProfile } from '@/lib/supabase/profile-service'
import { startExperienceSyncCoordinator } from '@/lib/supabase/experience-sync-repository'
import { startTrainingSyncCoordinator } from '@/lib/supabase/training-attempt-repositories'
import { startLearningSyncCoordinator } from '@/lib/supabase/learning-sync-repository'
import { startApplicationSyncCoordinator } from '@/lib/supabase/application-sync-repository'
import { getProfileCompletionStatus } from '@/lib/supabase/profile-completion-service'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type View = 'landing' | 'onboarding' | 'home' | 'auth' | 'admin' | 'ai-admin'
type CallbackState='exchanging'|'completed'|'failed'
const callbackStates=new Map<string,CallbackState>()
function callbackMarker(value:string){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619)}return `oauth-${(hash>>>0).toString(16)}`}

export function AppShell() {
  const [view, setView] = useState<View>('landing')
  const [answers, setAnswers] = useState<OnboardingAnswers>(emptyAnswers)
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [completed, setCompleted] = useState(false)
  const [oauthError, setOauthError] = useState<string>()
  const [openAccount, setOpenAccount] = useState(false)
  const [oauthExchanging,setOauthExchanging]=useState(false)

  useEffect(() => {
    const stored = loadOnboarding()
    if (stored) { setAnswers(stored.answers); setDiagnosis(stored.diagnosis); setCompleted(stored.completed && !!stored.diagnosis) }
    const params = new URLSearchParams(window.location.search)
    const authState = params.get('auth')
    if (authState === 'error') { setOauthError(params.get('authError')??'oauth_callback_error'); setView('auth') }
    if(authState==='callback'){
      const code=params.get('code'),returnTo=params.get('returnTo')??'/'
      params.delete('auth');params.delete('code');params.delete('returnTo');window.history.replaceState({},'',`${window.location.pathname}${params.toString()?`?${params.toString()}`:''}${window.location.hash}`)
      if(!code)return
      const marker=callbackMarker(code),storedState=sessionStorage.getItem(marker) as CallbackState|null,state=callbackStates.get(marker)??storedState
      if(state==='exchanging'||state==='completed'||state==='failed')return
      callbackStates.set(marker,'exchanging');sessionStorage.setItem(marker,'exchanging');setOauthExchanging(true)
      void (async()=>{const client=getSupabaseBrowserClient();const result=client?await client.auth.exchangeCodeForSession(code):{error:new Error('session_exchange_failed')};if(result.error){callbackStates.set(marker,'failed');sessionStorage.setItem(marker,'failed');setOauthExchanging(false);window.location.replace('/?auth=error&authError=session_exchange_failed');return}callbackStates.set(marker,'completed');sessionStorage.setItem(marker,'completed');setOauthExchanging(false);await ensureUserProfile();const status=await getProfileCompletionStatus();if(!status.authenticated){window.location.replace('/?auth=error&authError=session_exchange_failed');return}if(!status.completed){window.location.replace(`/profile/setup?returnTo=${encodeURIComponent(returnTo)}`);return}window.location.replace(`${returnTo}?auth=success&profileCompleted=1&openAccount=1`)})()
      return
    }
    if (authState === 'success') {
      sessionStorage.removeItem('cabin-auth-return-to')
      setOpenAccount(params.get('openAccount')==='1')
      setView(params.get('profileCompleted')==='1'||stored?.completed&&stored.diagnosis?'home':'onboarding')
    }
    if (authState) {
      params.delete('auth'); params.delete('authError'); params.delete('profileCompleted'); params.delete('openAccount')
      const query=params.toString()
      window.history.replaceState({},'',`${window.location.pathname}${query?`?${query}`:''}${window.location.hash}`)
    }
  }, [])
  useEffect(()=>{let stop=()=>{};let cancelled=false;const handle=async(user:Awaited<ReturnType<typeof authService.currentUser>>)=>{stop();stop=()=>{};if(!user||cancelled)return;await ensureUserProfile();const status=await getProfileCompletionStatus();if(cancelled)return;if(status.authenticated&&!status.completed){window.location.replace(`/profile/setup?returnTo=${encodeURIComponent(window.location.pathname)}`);return}if(status.completed){const stopExperience=startExperienceSyncCoordinator(user),stopTraining=startTrainingSyncCoordinator(user),stopLearning=startLearningSyncCoordinator(user),stopApplication=startApplicationSyncCoordinator(user);stop=()=>{stopExperience();stopTraining();stopLearning();stopApplication()};setView(current=>current==='landing'||current==='auth'?(completed?'home':'onboarding'):current)}};void authService.currentUser().then(handle);const unsubscribe=authService.onAuthStateChange(user=>{void handle(user)});return()=>{cancelled=true;stop();unsubscribe()}},[completed])

  async function handleAuthenticated(){
    const status=await getProfileCompletionStatus()
    if(status.authenticated&&!status.completed){window.location.assign('/profile/setup?returnTo=/');return}
    setView(completed?'home':'onboarding')
  }

  function finishOnboarding(result: DiagnosisResult, nextAnswers: OnboardingAnswers) {
    saveOnboarding({ completed: true, answers: nextAnswers, diagnosis: result })
    setAnswers(nextAnswers); setDiagnosis(result); setCompleted(true); setView('home')
  }

  return (
    // Restrained responsive layout: full-bleed on mobile, centered device frame on desktop.
    <div className="flex min-h-dvh w-full justify-center bg-navy md:items-center md:p-6">
      <div
        className={cn(
          'relative w-full max-w-[420px] overflow-hidden bg-background',
          'h-dvh md:h-[calc(100dvh-3rem)] md:max-h-[880px]',
          'md:rounded-[2.25rem] md:border md:border-white/10',
          'md:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]',
        )}
      >
        {oauthExchanging ? <div className="flex h-full items-center justify-center px-8"><div role="status" aria-live="polite" className="text-center"><div aria-hidden="true" className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-navy/20 border-t-navy"/><p className="mt-5 text-base font-bold text-navy">로그인 정보를 확인하고 있어요</p><p className="mt-2 text-sm text-muted-foreground">잠시만 기다려 주세요</p></div></div> : view === 'admin' ? <AirlineKnowledgeAdmin onExit={()=>setView('landing')} /> : view === 'ai-admin' ? <AiSettingsAdmin onExit={()=>setView('landing')} /> : view === 'auth' ? <AuthScreen onBack={()=>setView('landing')} onAuthenticated={()=>void handleAuthenticated()} initialOAuthError={oauthError}/> : view === 'landing' ? (
          <VideoLanding onStart={() => setView(completed ? 'home' : 'onboarding')} onLogin={()=>setView('auth')} />
        ) : view === 'onboarding' ? (
          <div className="h-full animate-in fade-in duration-500"><OnboardingFlow initialAnswers={answers} onSkip={() => setView('home')} onComplete={finishOnboarding} /></div>
        ) : (
          <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <HomeDashboard diagnosis={diagnosis} onboardingAnswers={answers} onEditDiagnosis={() => setView('onboarding')} onLogin={()=>setView('auth')} initialAccountOpen={openAccount} />
          </div>
        )}
        {process.env.NODE_ENV === 'development' && <><button type="button" onClick={()=>setView('admin')} className="absolute left-3 top-3 z-50 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white opacity-30 hover:opacity-100 focus-visible:opacity-100">ADMIN</button><button type="button" onClick={()=>setView('ai-admin')} className="absolute left-16 top-3 z-50 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white opacity-30 hover:opacity-100 focus-visible:opacity-100">AI</button><button type="button" onClick={() => { clearOnboarding(); setAnswers(emptyAnswers); setDiagnosis(null); setCompleted(false); setView('landing') }} className="absolute right-3 top-3 z-50 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white opacity-30 hover:opacity-100 focus-visible:opacity-100">RESET</button></>}
      </div>
    </div>
  )
}
