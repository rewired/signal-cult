export function isCompanionRuntime(root=document){
 return Boolean(root.querySelector('meta[name="grid-rot-runtime"][content="companion"]'));
}
export async function initializeCompanion(callbacks){
 if(!isCompanionRuntime())return;
 document.documentElement.classList.add('companion-runtime');
 const invoke=window.__TAURI__?.core?.invoke;
 if(!invoke)throw new Error('Companion bridge is unavailable.');
 const context=await invoke('host_exchange_context');
 if(!context?.active)return;
 callbacks.applyStateText(context.state);
 if(context.preview_data_url){
  const preview=new Image();
  preview.src=context.preview_data_url;
  await preview.decode();
  callbacks.applyPreview(preview);
 }else{
  document.querySelector('#host-preview-status').textContent='Source snapshot unavailable · settings can still be edited';
 }
 const session=document.querySelector('#host-session');
 session.hidden=false;
 document.querySelector('#host-apply').addEventListener('click',async()=>{
  try{await invoke('host_exchange_apply',{stateText:callbacks.currentStateText()});}
  catch(error){callbacks.showError(String(error));}
 });
 document.querySelector('#host-cancel').addEventListener('click',async()=>{
  try{await invoke('host_exchange_cancel');}
  catch(error){callbacks.showError(String(error));}
 });
}
