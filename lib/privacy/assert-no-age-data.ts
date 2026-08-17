const forbiddenKeys=new Set(['age','birthdate','birth_date','dateofbirth','dob','avatar','avatarurl','avatar_url','avatarpath','avatar_path','profileimage','profile_image','photo','picture'])

export function assertNoAgeDataInRecommendationContext(value:unknown,label='recommendation_or_ai_context'):void{
  const visit=(node:unknown,path:string,seen:WeakSet<object>)=>{
    if(!node||typeof node!=='object')return
    if(seen.has(node))return
    seen.add(node)
    for(const[key,child]of Object.entries(node)){
      const normalized=key.replace(/[-_\s]/g,'').toLowerCase()
      if(forbiddenKeys.has(key.toLowerCase())||forbiddenKeys.has(normalized)){
        const message=`Private profile data is forbidden in ${label}: ${path}.${key}`
        if(process.env.NODE_ENV!=='production')throw new Error(message)
        return
      }
      visit(child,`${path}.${key}`,seen)
    }
  }
  visit(value,label,new WeakSet())
}
