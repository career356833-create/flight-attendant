import {getSupabaseBrowserClient} from './client'
export type CloudAudioPreference='ask_each_time'|'upload'|'local_only'
export type AudioUploadInput={userId:string;entityType:'interview'|'self-introduction';entityId:string;file:Blob;fileName?:string}
const BUCKET='cabin-training-audio',SUPPORTED=new Set(['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/ogg']),MAX_BYTES=25*1024*1024
export function buildAudioPath(userId:string,entityType:'interview'|'self-introduction',entityId:string,fileName='answer.webm'){const clean=fileName.replace(/[^a-zA-Z0-9._-]/g,'_');return`${userId}/${entityType}/${entityId}/${clean}`}
export const storageService={
  async uploadAudio(input:AudioUploadInput){if(!SUPPORTED.has(input.file.type))throw new Error('지원하지 않는 오디오 형식이에요.');if(input.file.size>MAX_BYTES)throw new Error('오디오 파일은 25MB 이하여야 해요.');const c=getSupabaseBrowserClient();if(!c)throw new Error('not_configured');const path=buildAudioPath(input.userId,input.entityType,input.entityId,input.fileName);const{error}=await c.storage.from(BUCKET).upload(path,input.file,{contentType:input.file.type,upsert:true});if(error)throw error;return{bucket:BUCKET,path}},
  async createPlaybackUrl(path:string,expiresIn=300){const c=getSupabaseBrowserClient();if(!c)throw new Error('not_configured');const{data,error}=await c.storage.from(BUCKET).createSignedUrl(path,expiresIn);if(error)throw error;return data.signedUrl},
  async downloadAudio(path:string){const c=getSupabaseBrowserClient();if(!c)throw new Error('not_configured');const{data,error}=await c.storage.from(BUCKET).download(path);if(error)throw error;return data},
  async deleteAudio(path:string){const c=getSupabaseBrowserClient();if(!c)throw new Error('not_configured');const{error}=await c.storage.from(BUCKET).remove([path]);if(error)throw error},
  retryAudioUpload(input:AudioUploadInput){return this.uploadAudio(input)},
  async reconcileOrphanAudio(){return{checked:0,removed:0}}
}
