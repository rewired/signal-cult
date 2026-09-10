export function isCompanionRuntime(root=document){return Boolean(root.querySelector('meta[name="crt-sim-runtime"][content="companion"]'));}
export async function initializeCompanion(callbacks){
 if(!isCompanionRuntime())return;
 const invoke=window.__TAURI__?.core?.invoke;
 if(!invoke)throw new Error('Companion bridge is unavailable.');
 const context=await invoke('host_exchange_context');
 if(!context?.active)return;
 callbacks.applyPresetText(context.preset);
 if(context.preview_data_url){const preview=new Image();preview.src=context.preview_data_url;await preview.decode();callbacks.applyPreview(preview);}
 else document.querySelector('#host-preview-status').textContent='Test pattern preview · source snapshot unavailable · color management remains in Resolve';
 document.querySelector('#host-session').hidden=false;
 document.querySelector('#host-apply').addEventListener('click',async()=>{try{await invoke('host_exchange_apply',{preset:callbacks.currentPresetText()});}catch(error){callbacks.showError(String(error));}});
 document.querySelector('#host-cancel').addEventListener('click',async()=>{try{await invoke('host_exchange_cancel');}catch(error){callbacks.showError(String(error));}});
}
