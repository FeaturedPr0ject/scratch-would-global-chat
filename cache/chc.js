import {promises as fs} from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import v8 from "node:v8";

const ROOT=path.resolve(process.env.CHC_CACHE_DIR||path.join(process.cwd(),"cache"));
const MAGIC=Buffer.from("CHC2");
const VERSION=1;
const KDF_ID=0;
const HEADER_SIZE=4+1+1+4+12;
const TAG_SIZE=16;
const MAX_CACHE_BYTES=25*1024*1024;
const TYPES=new Set(["profilesdata","messages","configserver"]);

function getKey(){
 const value=process.env.CHC_CACHE_KEY||"";
 if(!/^[a-fA-F0-9]{64}$/.test(value))throw new Error("CHC_CACHE_KEY must be a 32-byte hexadecimal key.");
 return Buffer.from(value,"hex");
}

function safeSegment(value){
 const text=String(value||"");
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(text))throw new Error("Invalid CHC cache key.");
 return text;
}

function cachePath(type,name){
 if(!TYPES.has(type))throw new Error("Unsupported CHC cache type.");
 const filename=safeSegment(name)+".chc";
 const result=path.resolve(ROOT,type,filename);
 if(!result.startsWith(ROOT+path.sep))throw new Error("Invalid cache path.");
 return result;
}

function makeHeader(nonce){
 const header=Buffer.alloc(HEADER_SIZE);
 MAGIC.copy(header,0);
 header.writeUInt8(VERSION,4);
 header.writeUInt8(KDF_ID,5);
 header.writeUInt32BE(0,6);
 nonce.copy(header,10);
 return header;
}

function parseHeader(buffer){
 if(buffer.length<HEADER_SIZE+TAG_SIZE)throw new Error("CHC file is truncated.");
 if(!buffer.subarray(0,4).equals(MAGIC))throw new Error("Invalid CHC magic.");
 if(buffer.readUInt8(4)!==VERSION)throw new Error("Unsupported CHC version.");
 if(buffer.readUInt8(5)!==KDF_ID)throw new Error("Unsupported CHC key mode.");
 return buffer.subarray(0,HEADER_SIZE);
}

export async function writeCHC(type,name,value){
 const file=cachePath(type,name);
 const plain=v8.serialize(value);
 if(plain.length>MAX_CACHE_BYTES)throw new Error("CHC cache entry is too large.");
 const key=getKey();
 const nonce=crypto.randomBytes(12);
 const header=makeHeader(nonce);
 const cipher=crypto.createCipheriv("aes-256-gcm",key,nonce);
 cipher.setAAD(header);
 const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);
 const tag=cipher.getAuthTag();
 const output=Buffer.concat([header,encrypted,tag]);
 await fs.mkdir(path.dirname(file),{recursive:true});
 const temp=file+"."+crypto.randomBytes(8).toString("hex")+".tmp";
 try{
  await fs.writeFile(temp,output,{mode:0o600,flag:"wx"});
  await fs.rename(temp,file);
 }catch(error){
  await fs.rm(temp,{force:true}).catch(()=>{});
  throw error;
 }
 return {path:file,bytes:output.length};
}

export async function readCHC(type,name){
 const file=cachePath(type,name);
 let buffer;
 try{buffer=await fs.readFile(file)}catch(error){
  if(error.code==="ENOENT")return null;
  throw error;
 }
 if(buffer.length>MAX_CACHE_BYTES+HEADER_SIZE+TAG_SIZE)throw new Error("CHC cache entry exceeds size limit.");
 const header=parseHeader(buffer);
 const key=getKey();
 const nonce=header.subarray(10,22);
 const ciphertext=buffer.subarray(HEADER_SIZE,-TAG_SIZE);
 const tag=buffer.subarray(-TAG_SIZE);
 const decipher=crypto.createDecipheriv("aes-256-gcm",key,nonce);
 decipher.setAAD(header);
 decipher.setAuthTag(tag);
 const plain=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
 return v8.deserialize(plain);
}

export async function deleteCHC(type,name){
 const file=cachePath(type,name);
 await fs.rm(file,{force:true});
 return true;
}

export async function hasCHC(type,name){
 const file=cachePath(type,name);
 try{const stat=await fs.stat(file);return stat.isFile()}catch(error){if(error.code==="ENOENT")return false;throw error;}
}

export async function clearCHC(type){
 if(!TYPES.has(type))throw new Error("Unsupported CHC cache type.");
 await fs.rm(path.resolve(ROOT,type),{recursive:true,force:true});
 return true;
}

export async function listCHC(type){
 if(!TYPES.has(type))throw new Error("Unsupported CHC cache type.");
 const directory=path.resolve(ROOT,type);
 let entries;
 try{entries=await fs.readdir(directory,{withFileTypes:true})}catch(error){if(error.code==="ENOENT")return [];throw error;}
 return entries.filter(entry=>entry.isFile()&&entry.name.endsWith(".chc")).map(entry=>entry.name.slice(0,-4)).sort();
}

export async function getCHCStats(type,name){
 const file=cachePath(type,name);
 try{
  const stat=await fs.stat(file);
  return {exists:stat.isFile(),bytes:stat.size,modifiedAt:stat.mtime.toISOString()};
 }catch(error){if(error.code==="ENOENT")return {exists:false,bytes:0,modifiedAt:null};throw error;}
}

export const CHC_OPERATIONS=Object.freeze([
 {name:"writeCHC(type,name,value)",description:"Serialize a value with Node V8 binary serialization, encrypt it with AES-256-GCM, and atomically write a .chc file."},
 {name:"readCHC(type,name)",description:"Read and authenticate/decrypt a .chc file; returns null when it does not exist."},
 {name:"deleteCHC(type,name)",description:"Delete one cache file."},
 {name:"hasCHC(type,name)",description:"Check whether one cache file exists."},
 {name:"clearCHC(type)",description:"Delete all cache files in one supported cache category."},
 {name:"listCHC(type)",description:"List cache entry names in one category."},
 {name:"getCHCStats(type,name)",description:"Return existence, file size, and last-modified time."}
]);

export const CHC_CACHE_TYPES=Object.freeze(["profilesdata","messages","configserver"]);
