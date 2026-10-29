/* Password-protected portable files. Browser storage remains unencrypted. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./workspace.js'));else root.PyAtlasVault=factory(root.PyAtlasCore);})(typeof globalThis!=='undefined'?globalThis:this,function(core){
  'use strict';
  const LIMIT=8*1024*1024,ITERATIONS=600000,encoder=new TextEncoder(),aad=encoder.encode('PyAtlas encrypted workspace v1');
  function cryptoAPI(){if(!globalThis.crypto?.subtle)throw new Error('Encrypted backups require Web Crypto. Open the app through localhost or HTTPS in a supported browser.');return globalThis.crypto;}
  function passwordBytes(password){if(typeof password!=='string'||password.length<12||password.length>1024)throw new Error('Use a password between 12 and 1024 characters. There is no password recovery.');return encoder.encode(password);}
  function b64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
  function unb64(value,max){if(typeof value!=='string'||value.length>Math.ceil(max/3)*4||!value.length||value.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw new Error('Invalid encrypted backup encoding');return Uint8Array.from(atob(value),char=>char.charCodeAt(0));}
  async function key(password,salt,iterations,usage){const api=cryptoAPI();const material=await api.subtle.importKey('raw',passwordBytes(password),'PBKDF2',false,['deriveKey']);return api.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,[usage]);}
  function isEnvelope(value){return value?.format==='pyatlas-encrypted-workspace';}
  async function encrypt(current,password){
    const api=cryptoAPI(),bytes=encoder.encode(JSON.stringify(core.validate(current)));if(bytes.length>LIMIT)throw new Error('Workspace exceeds the 8 MB portable-backup limit');
    const salt=api.getRandomValues(new Uint8Array(16)),iv=api.getRandomValues(new Uint8Array(12));
    const ciphertext=await api.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},await key(password,salt,ITERATIONS,'encrypt'),bytes);
    return {format:'pyatlas-encrypted-workspace',version:1,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))};
  }
  async function decrypt(value,password){
    if(!isEnvelope(value)||value.version!==1||value.cipher!=='AES-256-GCM'||value.kdf!=='PBKDF2-SHA256'||!Number.isInteger(value.iterations)||value.iterations<100000||value.iterations>1000000)throw new Error('Unsupported encrypted backup');
    const salt=unb64(value.salt,16),iv=unb64(value.iv,12),ciphertext=unb64(value.ciphertext,LIMIT+16);if(salt.length!==16||iv.length!==12||ciphertext.length<16||ciphertext.length>LIMIT+16)throw new Error('Invalid encrypted backup lengths');
    const derived=await key(password,salt,value.iterations,'decrypt');let bytes;
    try{bytes=await cryptoAPI().subtle.decrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},derived,ciphertext);}catch(_){throw new Error('Wrong password or damaged backup. No workspace data was changed.');}
    if(bytes.byteLength>LIMIT)throw new Error('Workspace exceeds the portable-backup limit');return core.validate(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  }
  async function encryptBundle(value,password){
    const api=cryptoAPI(),bytes=encoder.encode(JSON.stringify(value));if(bytes.length>LIMIT)throw new Error('Complete backup exceeds 8 MB');
    const salt=api.getRandomValues(new Uint8Array(16)),iv=api.getRandomValues(new Uint8Array(12)),tag=encoder.encode('PyAtlas complete backup v1');
    const ciphertext=await api.subtle.encrypt({name:'AES-GCM',iv,additionalData:tag,tagLength:128},await key(password,salt,ITERATIONS,'encrypt'),bytes);
    return {format:'pyatlas-encrypted-complete',version:1,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))};
  }
  async function decryptBundle(value,password){
    if(value?.format!=='pyatlas-encrypted-complete'||value.version!==1||value.cipher!=='AES-256-GCM'||value.kdf!=='PBKDF2-SHA256'||!Number.isInteger(value.iterations)||value.iterations<100000||value.iterations>1000000)throw new Error('Unsupported complete backup');
    const salt=unb64(value.salt,16),iv=unb64(value.iv,12),ciphertext=unb64(value.ciphertext,LIMIT+16);if(salt.length!==16||iv.length!==12||ciphertext.length<16)throw new Error('Invalid backup lengths');
    const derived=await key(password,salt,value.iterations,'decrypt');let bytes;
    try{bytes=await cryptoAPI().subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode('PyAtlas complete backup v1'),tagLength:128},derived,ciphertext);}catch(_){throw new Error('Wrong password or damaged backup. No data was changed.');}
    if(bytes.byteLength>LIMIT)throw new Error('Complete backup exceeds 8 MB');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }
  return {encrypt,decrypt,isEnvelope,encryptBundle,decryptBundle};

});
