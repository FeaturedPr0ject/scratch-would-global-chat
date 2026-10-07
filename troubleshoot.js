const form=document.querySelector("#troubleshootForm");
const reasonInput=document.querySelector("#reasonInput");
const otherReasonWrap=document.querySelector("#otherReasonWrap");
const otherReasonInput=document.querySelector("#otherReasonInput");
const requestMessage=document.querySelector("#requestMessage");
const submitButton=form.querySelector("button[type=submit]");
const detailsInput=document.querySelector("#detailsInput");

const params=new URLSearchParams(location.search);
const presetReason=params.get("reason");
const presetError=params.get("error");
if(presetReason){
 reasonInput.value=presetReason;
 reasonInput.dispatchEvent(new Event("change"));
}
if(presetError){
 const prefix="Error code: "+presetError;
 detailsInput.value=detailsInput.value?prefix+"\\n\\n"+detailsInput.value:prefix;
}
const ENDPOINT="https://script.google.com/macros/s/AKfycbw7x_9kSRpck2bO_iEOC5M13pU07N_q0VVbVa6BaQeAgVfbe_cIs139Vv_7XP6g1pQo/exec";

reasonInput.addEventListener("change",()=>{
 const isOther=reasonInput.value==="Other";
 otherReasonWrap.classList.toggle("hidden",!isOther);
 otherReasonInput.required=isOther;
 if(!isOther)otherReasonInput.value="";
});

function buildRequest(){
 return {
  product:"SWGC Room Chats",
  type:"Troubleshoot",
  reason:reasonInput.value,
  otherReason:reasonInput.value==="Other"?otherReasonInput.value.trim():"",
  details:detailsInput.value.trim(),
  page:location.href,
  userAgent:navigator.userAgent,
  language:navigator.language,
  createdAt:new Date().toISOString()
 };
}

form.addEventListener("submit",async event=>{
 event.preventDefault();
 requestMessage.textContent="";
 const request=buildRequest();
 if(!request.reason||!request.details){
  requestMessage.textContent="Please complete the required fields.";
  return;
 }
 if(request.reason==="Other"&&!request.otherReason){
  requestMessage.textContent="Please write the other reason.";
  otherReasonInput.focus();
  return;
 }
 submitButton.disabled=true;
 submitButton.textContent="Sending...";
 try{
  const body=new URLSearchParams(request);
  await fetch(ENDPOINT,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body});
  requestMessage.textContent="Support request sent successfully.";
  form.reset();
  otherReasonWrap.classList.add("hidden");
  otherReasonInput.required=false;
 }catch{
  requestMessage.textContent="Could not send the support request. Please try again.";
 }finally{
  submitButton.disabled=false;
  submitButton.textContent="Send Support Request";
 }
});