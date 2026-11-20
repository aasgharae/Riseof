const DB_KEY="rise_local_accounts_v1";
const gate=document.getElementById("authGate"), form=document.getElementById("authForm"), title=document.getElementById("authTitle"), hint=document.getElementById("authHint"), submit=document.getElementById("authSubmit"), switchBtn=document.getElementById("authSwitch"), userInput=document.getElementById("authUsername"), passInput=document.getElementById("authPassword"), confirmWrap=document.getElementById("confirmWrap"), confirmInput=document.getElementById("authConfirm"), msg=document.getElementById("authMessage");
let mode="login";
function accounts(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'{"accounts":[]}').accounts||[];}catch{return [];}}
function setMessage(text,bad=true){msg.textContent=text;msg.classList.toggle("error",bad);msg.classList.toggle("success",!bad);}
function render(){
const has=accounts().length>0;
if(!has) mode="signup";
title.textContent=mode==="signup"?"ساخت حساب محلی":"ورود به Rise";
hint.textContent=mode==="signup"?"نام کاربری و رمز دلخواهت را بساز.":"برای ادامه با حساب ذخیره‌شده وارد شو.";
submit.textContent=mode==="signup"?"ساخت حساب و شروع":"ورود و شروع";
switchBtn.textContent=mode==="signup"?"حساب داری؟ ورود":"حساب نداری؟ ثبت‌نام";
switchBtn.classList.toggle("hidden",!has);
confirmWrap.classList.toggle("hidden",mode!=="signup");
passInput.autocomplete=mode==="signup"?"new-password":"current-password";
}
function bytesHex(b){return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function derive(password,salt,iterations){
if(!globalThis.crypto?.subtle) throw new Error("مرورگر برای رمزنگاری امن کافی نیست؛ بازی را با HTTPS یا localhost باز کن.");
const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:new Uint8Array(salt.match(/.{2}/g).map(x=>parseInt(x,16))),iterations,hash:"SHA-256"},key,256);
return bytesHex(bits);
}
function openGame(username){gate.classList.add("hidden");document.body.classList.remove("auth-locked");window.dispatchEvent(new CustomEvent("rise:authenticated",{detail:{username}}));}
switchBtn.addEventListener("click",()=>{mode=mode==="signup"?"login":"signup";setMessage("");render();});
form.addEventListener("submit",async e=>{
e.preventDefault();submit.disabled=true;setMessage("در حال بررسی…",false);
try{
const display=userInput.value.trim(), username=display.toLowerCase();
let displayName=display;
const password=passInput.value;
if(!/^[\p{L}\p{N}_-]{3,24}$/u.test(display)) throw new Error("نام کاربری ۳ تا ۲۴ حرف باشد و فقط حروف، عدد، _ یا - داشته باشد.");
let db=JSON.parse(localStorage.getItem(DB_KEY)||'{"accounts":[]}');
db.accounts=Array.isArray(db.accounts)?db.accounts:[];
if(mode==="signup"){
 if(password.length<8) throw new Error("رمز عبور باید حداقل ۸ نویسه باشد.");
 if(password!==confirmInput.value) throw new Error("تکرار رمز با رمز اصلی یکی نیست.");
 if(db.accounts.some(a=>a.username===username)) throw new Error("این نام کاربری قبلاً روی این مرورگر ثبت شده.");
 const salt=bytesHex(crypto.getRandomValues(new Uint8Array(16))), iterations=150000;
 const hash=await derive(password,salt,iterations);
 db.accounts.push({username,display,salt,iterations,hash});
 localStorage.setItem(DB_KEY,JSON.stringify(db));
 setMessage("حساب محلی ساخته شد.",false);
}else{
 const account=db.accounts.find(a=>a.username===username);
 if(!account) throw new Error("این حساب روی این مرورگر پیدا نشد.");
 if(await derive(password,account.salt,account.iterations)!==account.hash) throw new Error("نام کاربری یا رمز اشتباه است.");
 displayName=account.display||display;
}
openGame(mode==="signup"?display:displayName);
}catch(err){setMessage(err.message||"ورود انجام نشد.");}
finally{submit.disabled=false;}
});
render();
