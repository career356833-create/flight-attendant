import {NextResponse,type NextRequest} from 'next/server'

const safeReturnTo=(value:string|null)=>value?.startsWith('/')&&!value.startsWith('//')?value:'/'
const errorRedirect=(request:NextRequest,code:string)=>{
  const url=new URL('/',request.url)
  url.searchParams.set('auth','error')
  url.searchParams.set('authError',code)
  return NextResponse.redirect(url)
}

/**
 * The browser client owns the PKCE verifier.  Preserve the route as the OAuth
 * redirect target, then hand the one-time code to the browser for exchange.
 */
export async function GET(request:NextRequest){
  const error=request.nextUrl.searchParams.get('error')
  const errorCode=request.nextUrl.searchParams.get('error_code')
  if(error)return errorRedirect(request,errorCode==='access_denied'||error==='access_denied'?'access_denied':errorCode??'oauth_callback_error')
  const code=request.nextUrl.searchParams.get('code')
  if(!code)return errorRedirect(request,'oauth_callback_error')
  const destination=new URL('/',request.url)
  destination.searchParams.set('auth','callback')
  destination.searchParams.set('code',code)
  destination.searchParams.set('returnTo',safeReturnTo(request.nextUrl.searchParams.get('returnTo')))
  return NextResponse.redirect(destination)
}
