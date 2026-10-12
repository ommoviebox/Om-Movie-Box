import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const loginForm=document.querySelector("#loginForm"), dashboard=document.querySelector("#dashboard");
const authMessage=document.querySelector("#authMessage"), saveMessage=document.querySelector("#saveMessage");
const titleForm=document.querySelector("#titleForm"), list=document.querySelector("#adminTitles");
let auth,db,currentUser=null;
const configured=firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE_") && firebaseConfig.projectId && firebaseConfig.projectId!=="YOUR_PROJECT_ID";
if(configured){const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,user=>{currentUser=user;loginForm.hidden=!!user;dashboard.hidden=!user;if(user)loadAdminTitles();});}
else {authMessage.textContent="Setup required: add your Firebase Web App config to firebase-config.js.";loginForm.querySelector("button").disabled=true;}

loginForm.addEventListener("submit",async e=>{e.preventDefault();if(!auth)return;authMessage.textContent="Signing in…";try{await signInWithEmailAndPassword(auth,document.querySelector("#email").value.trim(),document.querySelector("#password").value);authMessage.textContent="Signed in."; }catch(err){authMessage.textContent="Sign in failed. Check your credentials and Firebase setup.";console.error(err);}});
document.querySelector("#logoutButton").addEventListener("click",()=>signOut(auth));
function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function safeUrl(value=""){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}}
function val(id){return document.querySelector("#"+id).value.trim();}
function resetForm(){titleForm.reset();document.querySelector("#editId").value="";document.querySelector("#yearInput").value=new Date().getFullYear();document.querySelector("#publishedInput").checked=true;}
document.querySelector("#resetForm").addEventListener("click",resetForm);

titleForm.addEventListener("submit",async e=>{
 e.preventDefault(); if(!currentUser||!db)return;
 const officialUrl=val("officialUrlInput"),poster=val("posterInput");
 if((officialUrl&&!safeUrl(officialUrl))||(poster&&!safeUrl(poster))){saveMessage.textContent="Please use valid http(s) URLs.";return;}
 const payload={title:val("title"),type:val("contentType"),year:Number(val("yearInput")),genre:val("genreInput"),language:val("languageInput"),quality:val("qualityInput")||"HD",poster,description:val("descriptionInput"),officialUrl,published:document.querySelector("#publishedInput").checked,updatedAt:serverTimestamp(),updatedBy:currentUser.uid};
 try{
   const id=val("editId");
   if(id) await updateDoc(doc(db,"titles",id),payload);
   else await addDoc(collection(db,"titles"),{...payload,createdAt:serverTimestamp(),createdBy:currentUser.uid});
   saveMessage.textContent="Title saved successfully.";resetForm();await loadAdminTitles();
 }catch(err){saveMessage.textContent="Could not save. Check Firestore rules and admin permissions.";console.error(err);}
});
async function loadAdminTitles(){
 if(!db||!currentUser)return;
 try{
  const snap=await getDocs(query(collection(db,"titles"),orderBy("createdAt","desc")));
  list.innerHTML=snap.docs.map(d=>{const t=d.data();return `<article class="admin-title-row"><div><strong>${escapeHtml(t.title||"Untitled")}</strong><p>${escapeHtml(t.type||"")} · ${escapeHtml(t.year||"")} · ${t.published?"Published":"Draft"}</p></div><div class="row-actions"><button type="button" data-edit="${d.id}" class="secondary-button">EDIT</button><button type="button" data-delete="${d.id}" class="danger-button">DELETE</button></div></article>`;}).join("")||"<p class='muted'>No titles yet. Add your first title above.</p>";
 }catch(err){list.innerHTML="<p class='muted'>Could not load titles. Verify Firestore rules.</p>";console.error(err);}
}
list.addEventListener("click",async e=>{
 const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
 if(edit){const snap=await getDocs(collection(db,"titles"));const found=snap.docs.find(d=>d.id===edit.dataset.edit);if(!found)return;const t=found.data();document.querySelector("#editId").value=found.id;for(const [id,key] of [["title","title"],["contentType","type"],["yearInput","year"],["genreInput","genre"],["languageInput","language"],["qualityInput","quality"],["posterInput","poster"],["descriptionInput","description"],["officialUrlInput","officialUrl"]])document.querySelector("#"+id).value=t[key]??"";document.querySelector("#publishedInput").checked=!!t.published;titleForm.scrollIntoView({behavior:"smooth"});}
 if(del&&confirm("Delete this title permanently?")){try{await deleteDoc(doc(db,"titles",del.dataset.delete));saveMessage.textContent="Title deleted.";await loadAdminTitles();}catch(err){saveMessage.textContent="Delete failed. Check permissions.";console.error(err);}}
});
