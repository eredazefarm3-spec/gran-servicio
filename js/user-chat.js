/* Chat cliente-profesional en tiempo real. El original nunca se sobrescribe. */
(() => {
 const $=s=>document.querySelector(s);
 const params=new URLSearchParams(location.search);
 const id=Number(params.get("id"));
 const role=location.pathname.includes("/profesional/")?"profesional":"cliente";
 const lang=params.get("lang")==="en"?"en":(window.GS_I18N?.lang||"es");
 let session=null, channel=null, messages=[];
 const t=(es,en)=>lang==="en"?en:es;
 const esc=s=>typeof gsEscapeHtml==="function"?gsEscapeHtml(s):String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
 async function translate(text){
  const {data,error}=await supabaseClient.functions.invoke("gs-translate-message",{body:{text,target_lang:lang==="en"?"EN":"ES"}});
  if(error) throw error;
  if(!data?.translatedText) throw new Error(data?.error||"Translation unavailable");
  return data.translatedText;
 }
 function render(){
  const host=$("#gs-chat-messages");
  if(!messages.length){host.innerHTML='<div class="gs-chat-empty">'+t("Todavía no hay mensajes.","No messages yet.")+"</div>";return;}
  host.innerHTML=messages.map(m=>{
   const mine=m.remitente_auth_id===session.user.id, original=m.idioma_original||"es", same=original===lang;
   const body=!same?(m.__translated||m.contenido):m.contenido;
   return '<article class="gs-chat-message '+(mine?"mine":"theirs")+'" data-id="'+m.id_mensaje+'"><p class="gs-chat-body">'+esc(body)+'</p><div class="gs-chat-meta"><span>'+esc(m.remitente_tipo)+'</span><span>'+esc(new Date(m.fecha_envio).toLocaleString(lang==="en"?"en-US":"es-AR"))+'</span></div>'+
    (!same?'<div class="gs-chat-actions"><button class="btn btn-outline btn-sm" data-action="translate" data-id="'+m.id_mensaje+'">'+t("Traducir","Translate")+'</button><button class="btn btn-ghost btn-sm" data-action="original" data-id="'+m.id_mensaje+'">'+t("Ver original","View original")+'</button></div>':"")+
    '<div class="gs-chat-translation" hidden></div></article>';
  }).join("");
  host.scrollTop=host.scrollHeight;
 }
 async function autoTranslate(items){
  for(const m of items){
   if((m.idioma_original||"es")===lang||m.__translated||m.__translationTried)continue;
   m.__translationTried=true;
   try{m.__translated=await translate(m.contenido);render();}
   catch(e){$("#gs-chat-error").textContent=t("Traducción automática no disponible. Configurá DEEPL_AUTH_KEY en los secretos de Supabase.","Automatic translation is unavailable. Configure DEEPL_AUTH_KEY in Supabase secrets.");break;}
  }
 }
 async function load(){
  const {data,error}=await supabaseClient.from("mensajes_usuarios").select("id_mensaje,id_conversacion,remitente_auth_id,remitente_tipo,contenido,idioma_original,fecha_envio").eq("id_conversacion",id).order("fecha_envio",{ascending:true});
  if(error)throw error;messages=data||[];render();void autoTranslate(messages);
 }
 async function send(){
  const input=$("#gs-chat-input"),button=$("#gs-chat-send"),text=input.value.trim();
  if(!text)return;
  button.disabled=input.disabled=true;button.textContent=t("Enviando…","Sending…");
  try{
   const {error}=await supabaseClient.from("mensajes_usuarios").insert({id_conversacion:id,remitente_auth_id:session.user.id,remitente_tipo:role,contenido:text,idioma_original:lang});
   if(error)throw error;input.value="";await load();$("#gs-chat-error").textContent="";
  }catch(e){$("#gs-chat-error").textContent=e.message||t("No se pudo enviar el mensaje.","Could not send message.");}
  finally{button.disabled=input.disabled=false;button.textContent=t("Enviar","Send");input.focus();}
 }
 async function start(){
  if(!Number.isInteger(id)||id<1){$("#gs-chat-error").textContent=t("Identificador de conversación inválido.","Invalid conversation ID.");return;}
  session=await gsProtegerPagina(role);if(!session)return;
  const {data:conv,error}=await supabaseClient.from("conversaciones_usuarios").select("id_conversacion,cerrada_en,id_cliente,id_profesional").eq("id_conversacion",id).maybeSingle();
  if(error||!conv){$("#gs-chat-error").textContent=t("Conversación no disponible o acceso denegado.","Conversation unavailable or access denied.");$("#gs-chat-send").disabled=true;return;}
  if(conv.cerrada_en){$("#gs-chat-input").disabled=$("#gs-chat-send").disabled=true;$("#gs-chat-error").textContent=t("Esta conversación está cerrada.","This conversation is closed.");}
  await load();
  channel=supabaseClient.channel("users-chat-"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"mensajes_usuarios",filter:"id_conversacion=eq."+id},async p=>{if(!messages.some(m=>m.id_mensaje===p.new.id_mensaje)){messages.push(p.new);render();void autoTranslate([p.new]);}}).subscribe();
  $("#gs-chat-send").addEventListener("click",send);
  $("#gs-chat-input").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}});
  $("#gs-chat-messages").addEventListener("click",async e=>{
   const b=e.target.closest("button[data-action]");if(!b)return;
   const m=messages.find(x=>String(x.id_mensaje)===b.dataset.id);const card=b.closest(".gs-chat-message");const body=card.querySelector(".gs-chat-body");
   if(b.dataset.action==="original"){const showing=body.dataset.original==="true";body.textContent=showing?(m.__translated||m.contenido):m.contenido;body.dataset.original=showing?"false":"true";b.textContent=showing?t("Ver original","View original"):t("Ver traducción","View translation");return;}
   b.disabled=true;try{m.__translated=await translate(m.contenido);body.textContent=m.__translated;body.dataset.original="false";b.textContent=t("Traducido","Translated");}catch(e){$("#gs-chat-error").textContent=t("No se pudo traducir. Verificá la configuración del servicio.","Translation failed. Check provider configuration.");}finally{b.disabled=false;}
  });
 }
 document.addEventListener("DOMContentLoaded",()=>{
  $("#gs-chat-title").textContent=t("Chat con profesional/cliente","Client/professional chat");
  $("#gs-chat-input").placeholder=t("Escribí tu mensaje…","Write your message…");
  $("#gs-chat-send").textContent=t("Enviar","Send");
  $("#gs-chat-back").textContent=t("Volver a mensajes","Back to messages");
  if(window.GS_I18N)$("#gs-chat-language").appendChild(GS_I18N.switcher());
  start().catch(e=>{$("#gs-chat-error").textContent=e.message||"Error";});
 });
 window.addEventListener("beforeunload",()=>{if(channel&&supabaseClient)supabaseClient.removeChannel(channel);});
})();