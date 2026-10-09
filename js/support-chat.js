/* Chat de soporte existente: usa las tablas reales conversaciones_soporte y mensajes_soporte. */
(() => {
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const conversationId = Number(params.get("id"));
  const role = location.pathname.includes("/profesional/") ? "profesional" : (location.pathname.includes("/admin/") ? "empleado" : "cliente");
  const uiLang = params.get("lang") === "en" ? "en" : (window.GS_I18N?.lang || "es");
  let sessionInfo = null;
  let channel = null;
  let allMessages = [];
  const translationAttempted = new Set();
  const t = (key) => window.GS_I18N?.t(key) || key;
  const escape = (s) => typeof gsEscapeHtml === "function" ? gsEscapeHtml(s) : String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const targetLang = () => uiLang === "en" ? "EN" : "ES";

  async function translateMessage(message) {
    const { data, error } = await supabaseClient.functions.invoke("gs-translate-message", { body: { source: "soporte", message_id: message.id_mensaje, target_lang: targetLang() } });
    if (error) throw error;
    if (!data?.translatedText) throw new Error(data?.error || "Translation unavailable");
    return data.translatedText;
  }

  function renderMessages() {
    const list = $("#gs-chat-messages");
    if (!list) return;
    if (!allMessages.length) {
      list.innerHTML = '<div class="gs-chat-empty">' + (uiLang === "en" ? "No messages yet. Send the first message." : "Todavía no hay mensajes. Enviá el primero.") + "</div>";
      return;
    }
    list.innerHTML = allMessages.map(m => {
      const mine = m.remitente_tipo === role;
      const originalLang = m.idioma_original || "es";
      const sameLang = originalLang === uiLang;
      const content = sameLang ? m.contenido : (m.__translated || "");
      const label = originalLang === "en" ? "English" : "Español";
      return '<article class="gs-chat-message ' + (mine ? "mine" : "theirs") + '" data-message-id="' + m.id_mensaje + '">' +
        '<p class="gs-chat-body">' + escape(content || m.contenido) + '</p>' +
        '<div class="gs-chat-meta"><span>' + escape(m.remitente_tipo) + '</span><span>' + escape(new Date(m.fecha_envio).toLocaleString(uiLang === "en" ? "en-US" : "es-AR")) + '</span>' +
        '<span>' + escape(sameLang ? label : (uiLang === "en" ? "Translated from " : "Traducido desde ") + label) + '</span></div>' +
        (sameLang ? "" : '<div class="gs-chat-actions"><button class="btn btn-outline btn-sm" data-action="translate" data-id="' + m.id_mensaje + '">' + (uiLang === "en" ? "Translate" : "Traducir") + '</button><button class="btn btn-ghost btn-sm" data-action="original" data-id="' + m.id_mensaje + '">' + (uiLang === "en" ? "View original" : "Ver original") + '</button></div>') +
        '<div class="gs-chat-translation" hidden></div></article>';
    }).join("");
    list.scrollTop = list.scrollHeight;
  }

  async function autoTranslateForeignMessages(messages) {
    for (const message of messages) {
      if ((message.idioma_original || "es") === uiLang || message.__translated || translationAttempted.has(message.id_mensaje)) continue;
      translationAttempted.add(message.id_mensaje);
      try {
        message.__translated = await translateText(message.contenido);
        renderMessages();
      } catch (error) {
        const errorBox = $("#gs-chat-error");
        if (errorBox && !errorBox.textContent) errorBox.textContent = uiLang === "en"
          ? "Automatic translation is unavailable. Configure the DEEPL_AUTH_KEY secret in Supabase to enable it."
          : "La traducción automática no está disponible. Configurá el secreto DEEPL_AUTH_KEY en Supabase para habilitarla.";
        break;
      }
    }
  }

  async function loadMessages() {
    const { data, error } = await supabaseClient.from("mensajes_soporte").select("id_mensaje,id_conversacion,remitente_tipo,contenido,fecha_envio,idioma_original,traduccion_es,traduccion_en").eq("id_conversacion", conversationId).order("fecha_envio", { ascending: true });
    if (error) throw error;
    allMessages = (data || []).map(m => ({...m, __translated: uiLang === "en" ? (m.traduccion_en || undefined) : (m.traduccion_es || undefined)}));
    renderMessages();
    void autoTranslateForeignMessages(allMessages);
  }

  async function sendMessage() {
    const input = $("#gs-chat-input");
    const button = $("#gs-chat-send");
    const text = input.value.trim();
    if (!text) return;
    if (!sessionInfo || !conversationId) return;
    input.disabled = button.disabled = true;
    button.textContent = t("sending");
    try {
      const { data: conv, error: convError } = await supabaseClient.from("conversaciones_soporte").select("id_conversacion,fecha_cierre").eq("id_conversacion", conversationId).maybeSingle();
      if (convError) throw convError;
      if (!conv || conv.fecha_cierre) throw new Error(t("closeConversation"));
      const { error } = await supabaseClient.from("mensajes_soporte").insert({
        id_conversacion: conversationId,
        remitente_tipo: role,
        contenido: text,
        idioma_original: uiLang
      });
      if (error) throw error;
      input.value = "";
      await loadMessages();
    } catch (error) {
      $("#gs-chat-error").textContent = error.message || (uiLang === "en" ? "Could not send message." : "No se pudo enviar el mensaje.");
    } finally {
      input.disabled = button.disabled = false;
      button.textContent = t("send");
      input.focus();
    }
  }

  async function handleMessageAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const msg = allMessages.find(m => String(m.id_mensaje) === button.dataset.id);
    const article = button.closest(".gs-chat-message");
    const translation = article.querySelector(".gs-chat-translation");
    if (!msg) return;
    if (button.dataset.action === "original") {
      const body = article.querySelector(".gs-chat-body");
      const showingOriginal = body.dataset.original === "true";
      body.textContent = showingOriginal ? (msg.__translated || msg.contenido) : msg.contenido;
      body.dataset.original = showingOriginal ? "false" : "true";
      button.textContent = showingOriginal ? (uiLang === "en" ? "View original" : "Ver original") : (uiLang === "en" ? "View translation" : "Ver traducción");
      return;
    }
    button.disabled = true;
    button.textContent = uiLang === "en" ? "Translating…" : "Traduciendo…";
    try {
      const translated = await translateMessage(msg);
      msg.__translated = translated;
      translation.hidden = false;
      translation.innerHTML = '<span class="gs-chat-translation-label">' + (uiLang === "en" ? "Automatic translation" : "Traducción automática") + '</span><p>' + escape(translated) + '</p>';
      const body = article.querySelector(".gs-chat-body");
      body.textContent = translated;
      body.dataset.original = "false";
      const originalButton = article.querySelector('[data-action="original"]');
      if (originalButton) originalButton.textContent = uiLang === "en" ? "View original" : "Ver original";
      button.textContent = uiLang === "en" ? "Translated" : "Traducido";
    } catch (error) {
      $("#gs-chat-error").textContent = uiLang === "en"
        ? "Translation is not configured yet. Add the DeepL API key to Supabase Edge Function secrets."
        : "La traducción todavía no está configurada. Agregá la clave API de DeepL a los secretos de Edge Functions de Supabase.";
      button.textContent = uiLang === "en" ? "Retry translation" : "Reintentar traducción";
    } finally { button.disabled = false; }
  }

  async function start() {
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      $("#gs-chat-error").textContent = uiLang === "en" ? "Missing or invalid conversation ID." : "Falta un identificador de conversación válido.";
      $("#gs-chat-send").disabled = true;
      return;
    }
    const session = await gsProtegerPagina(role);
    if (!session) return;
    sessionInfo = session;
    const { data: conv, error } = await supabaseClient.from("conversaciones_soporte").select("id_conversacion,fecha_cierre,id_cliente,id_profesional,id_empleado").eq("id_conversacion", conversationId).maybeSingle();
    if (error || !conv) {
      $("#gs-chat-error").textContent = uiLang === "en" ? "Conversation unavailable or access denied." : "La conversación no está disponible o no tenés acceso.";
      $("#gs-chat-send").disabled = true;
      return;
    }
    if (conv.fecha_cierre) {
      $("#gs-chat-input").disabled = $("#gs-chat-send").disabled = true;
      $("#gs-chat-error").textContent = t("closeConversation");
    }
    await loadMessages();
    channel = supabaseClient.channel("support-chat-" + conversationId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes_soporte", filter: "id_conversacion=eq." + conversationId }, async payload => {
        if (!allMessages.some(m => m.id_mensaje === payload.new.id_mensaje)) {
          allMessages.push(payload.new);
          allMessages.sort((a,b) => new Date(a.fecha_envio)-new Date(b.fecha_envio));
          renderMessages();
          void autoTranslateForeignMessages([payload.new]);
        }
      }).subscribe();
    $("#gs-chat-send").addEventListener("click", sendMessage);
    $("#gs-chat-input").addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
    $("#gs-chat-messages").addEventListener("click", handleMessageAction);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const title = $("#gs-chat-title");
    if (title) title.textContent = uiLang === "en" ? "Live support chat" : "Chat de soporte en vivo";
    const input = $("#gs-chat-input");
    if (input) input.placeholder = uiLang === "en" ? "Write your message…" : "Escribí tu mensaje…";
    const send = $("#gs-chat-send");
    if (send) send.textContent = t("send");
    const back = $("#gs-chat-back");
    if (back) back.textContent = uiLang === "en" ? "Back to messages" : "Volver a mensajes";
    if (window.GS_I18N && $("#gs-chat-language")) $("#gs-chat-language").appendChild(GS_I18N.switcher());
    start().catch(error => { $("#gs-chat-error").textContent = error.message || "Error"; });
  });
  window.addEventListener("beforeunload", () => { if (channel && supabaseClient) supabaseClient.removeChannel(channel); });
})();