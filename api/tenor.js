export default async function handler(request,response){
 if(request.method!=="GET"){
  response.status(405).json({ok:false,error:"Method not allowed"});
  return;
 }
 const apiKey=process.env.TENOR_API_KEY||"";
 if(!apiKey){
  response.status(503).json({ok:false,error:"Tenor is not configured"});
  return;
 }
 const query=String(request.query?.q||"").trim();
 const clientKey=process.env.TENOR_CLIENT_KEY||"swgc_room_chats";
 const endpoint=query?"https://tenor.googleapis.com/v2/search":"https://tenor.googleapis.com/v2/featured";
 const params=new URLSearchParams({
  key:apiKey,
  client_key:clientKey,
  searchfilter:"sticker",
  country:"VN",
  locale:"vi_VN",
  contentfilter:"medium",
  media_filter:"tinygif,nanogif,gif,webp,tinywebp,nanowebp",
  limit:"24"
 });
 if(query)params.set("q",query);
 try{
  const result=await fetch(endpoint+"?"+params.toString());
  const data=await result.json();
  if(!result.ok){
   response.status(result.status).json({ok:false,error:"Tenor request failed"});
   return;
  }
  const stickers=(data.results||[]).map(item=>{
   const media=item.media_formats||item.media||{};
   const keys=["tinywebp","nanowebp","webp","tinygif","nanogif","gif"];
   for(const key of keys){
    const url=media[key]?.url;
    if(url)return url;
   }
   return "";
  }).filter(Boolean);
  response.status(200).json({ok:true,stickers});
 }catch{
  response.status(502).json({ok:false,error:"Could not reach Tenor"});
 }
}