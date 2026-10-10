import http from "node:http";
import {createClient} from "@supabase/supabase-js";
import {promises as fs} from "node:fs";
import path from "node:path";
import {writeCHC,readCHC,hasCHC,deleteCHC,CHC_CACHE_TYPES} from "./cache/chc.js";

const PORT=Number(process.env.PORT||3000);
const FRONTEND_ORIGINS=(process.env.FRONTEND_ORIGINS||"").split(",").map(value=>value.trim()).filter(Boolean);
const SUPABASE_URL=process.env.SUPABASE_URL||"";
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY||"";
const CACHE_ROOT=path.resolve(process.env.CHC_CACHE_DIR||path.join(process.cwd(),"cache"));
let cacheReady=false;
let cacheError="Cache initialization has not run.";

async function initializeCache(){
 try{
  for(const type of CHC_CACHE_TYPES)await fs.mkdir(path.join(CACHE_ROOT,type),{recursive:true});
  if(!process.env.CHC_CACHE_KEY){
   cacheReady=false;
   cacheError="CHC_CACHE_KEY is missing.";
   process.stderr.write(cacheError+"\\n");
   return;
  }
  const exists=await hasCHC("configserver","config");
  if(exists){
   try{
    await readCHC("configserver","config");
   }catch(error){
    process.stderr.write("Existing config.chc could not be read; recreating config cache: "+error.message+"\\n");
    await deleteCHC("configserver","config");
    await writeCHC("configserver","config",{format:"CHC2",version:1,cacheEnabled:true,createdAt:new Date().toISOString()});
    await readCHC("configserver","config");
   }
  }else{
   await writeCHC("configserver","config",{format:"CHC2",version:1,cacheEnabled:true,createdAt:new Date().toISOString()});
   await readCHC("configserver","config");
  }
  cacheReady=true;
  cacheError="";
  process.stdout.write("CHC cache initialized and encrypted.\\n");
 }catch(error){
  cacheReady=false;
  cacheError=error instanceof Error?error.message:"Unknown cache initialization error.";
  process.stderr.write("CHC cache initialization failed: "+cacheError+"\\n");
 }
