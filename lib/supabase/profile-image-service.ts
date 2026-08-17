import {getSupabaseBrowserClient} from './client'

export const PROFILE_IMAGE_BUCKET='cabin-profile-images'
const ALLOWED=new Set(['image/jpeg','image/png','image/webp'])
const MAX_BYTES=5*1024*1024

export type ProfileImageValidation={ok:true}|{ok:false;code:'unsupported_type'|'too_large'}
export type ProcessedProfileImage={blob:Blob;previewUrl:string;width:number;height:number}
export type DisplayAvatar={kind:'uploaded'|'google'|'initials';url?:string;initials:string}

export function validateProfileImage(file:File):ProfileImageValidation{
  if(!ALLOWED.has(file.type))return{ok:false,code:'unsupported_type'}
  if(file.size>MAX_BYTES)return{ok:false,code:'too_large'}
  return{ok:true}
}

async function bitmapFrom(file:Blob){
  if('createImageBitmap'in window)return createImageBitmap(file,{imageOrientation:'from-image'})
  const url=URL.createObjectURL(file)
  try{return await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('decode_failed'));image.src=url})}finally{URL.revokeObjectURL(url)}
}

export async function processProfileImage(file:File):Promise<ProcessedProfileImage>{
  const source=await bitmapFrom(file),sourceWidth=source.width,sourceHeight=source.height,size=Math.min(sourceWidth,sourceHeight),left=(sourceWidth-size)/2,top=(sourceHeight-size)/2,target=Math.min(512,size)
  const canvas=document.createElement('canvas');canvas.width=target;canvas.height=target
  const context=canvas.getContext('2d');if(!context)throw new Error('processing_failed')
  context.drawImage(source,left,top,size,size,0,0,target,target)
  if('close'in source)source.close()
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('processing_failed')),'image/webp',.8))
  return{blob,previewUrl:URL.createObjectURL(blob),width:target,height:target}
}

export function revokeProfileImagePreview(url?:string){if(url)URL.revokeObjectURL(url)}
export function buildProfileImagePath(userId:string){return`${userId}/avatar/${crypto.randomUUID()}.webp`}

async function currentUser(){const client=getSupabaseBrowserClient();if(!client)throw new Error('not_configured');const{data:{user}}=await client.auth.getUser();if(!user)throw new Error('not_authenticated');return{client,user}}

export async function uploadProfileImage(blob:Blob){const{client,user}=await currentUser();const path=buildProfileImagePath(user.id);const{error}=await client.storage.from(PROFILE_IMAGE_BUCKET).upload(path,blob,{contentType:'image/webp',upsert:false});if(error)throw error;return path}
export async function deleteProfileImage(path:string){const{client}=await currentUser();const{error}=await client.storage.from(PROFILE_IMAGE_BUCKET).remove([path]);if(error)throw error}

export async function replaceProfileImage(blob:Blob){
  const{client,user}=await currentUser();const{data:profile,error:readError}=await client.from('profiles').select('avatar_path').eq('id',user.id).single();if(readError)throw readError
  const previousPath=profile.avatar_path??null
  const path=await uploadProfileImage(blob)
  const{error:updateError}=await client.from('profiles').update({avatar_path:path} as never).eq('id',user.id)
  if(updateError){await client.storage.from(PROFILE_IMAGE_BUCKET).remove([path]);throw updateError}
  if(previousPath&&previousPath!==path){try{await client.storage.from(PROFILE_IMAGE_BUCKET).remove([previousPath])}catch{/* New image remains authoritative; retry cleanup later. */}}
  return path
}

export async function useGoogleAvatar(){const{client,user}=await currentUser();const{data:profile,error}=await client.from('profiles').select('avatar_path').eq('id',user.id).single();if(error)throw error;const oldPath=profile.avatar_path??null;const{error:updateError}=await client.from('profiles').update({avatar_path:null} as never).eq('id',user.id);if(updateError)throw updateError;if(oldPath)try{await client.storage.from(PROFILE_IMAGE_BUCKET).remove([oldPath])}catch{/* Profile already safely falls back to Google/initials. */}}
export const deleteProfileAvatar=useGoogleAvatar

export async function getProfileImageUrl(path:string,expiresIn=300){const{client}=await currentUser();const{data,error}=await client.storage.from(PROFILE_IMAGE_BUCKET).createSignedUrl(path,expiresIn);if(error)throw error;return data.signedUrl}
export function getGoogleAvatarUrl(value?:string|null){return value?.startsWith('https://')?value:undefined}
export async function resolveDisplayedAvatar(input:{avatarPath?:string|null;avatarUrl?:string|null;name?:string|null}) :Promise<DisplayAvatar>{
  const initials=(input.name?.trim().slice(0,1)||'?').toUpperCase()
  if(input.avatarPath){try{return{kind:'uploaded',url:await getProfileImageUrl(input.avatarPath),initials}}catch{/* Expired or unavailable signed URL falls back safely. */}}
  const google=getGoogleAvatarUrl(input.avatarUrl);if(google)return{kind:'google',url:google,initials}
  return{kind:'initials',initials}
}
export async function reconcileOrphanProfileImages(){return{checked:0,removed:0}}
