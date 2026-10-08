/* Gran Servicio: idioma de interfaz. No cambia nombres de funciones, tablas ni campos de Supabase. */
(function () {
  const supported = ["es", "en"];
  const pathLang = location.pathname.match(/^\/(es|en)(?:\/|$)/)?.[1];
  const queryLang = new URLSearchParams(location.search).get("lang");
  const saved = (() => { try { return localStorage.getItem("gs-language"); } catch { return null; } })();
  const browser = (navigator.language || "es").toLowerCase().startsWith("en") ? "en" : "es";
  const lang = supported.includes(pathLang) ? pathLang : (supported.includes(queryLang) ? queryLang : (supported.includes(saved) ? saved : browser));
  const dictionaries = {
    es: { language: "Idioma", spanish: "Español", english: "Inglés", translate: "Traducir", showOriginal: "Ver original", showTranslation: "Ver traducción", translationError: "No se pudo traducir este mensaje. Intentá de nuevo.", originalLabel: "Mensaje original", translatedLabel: "Traducción automática", sending: "Enviando…", send: "Enviar", writeMessage: "Escribí tu mensaje…", closeConversation: "Esta conversación está cerrada.", translationUnavailable: "La traducción no está configurada todavía." },
    en: { language: "Language", spanish: "Spanish", english: "English", translate: "Translate", showOriginal: "View original", showTranslation: "View translation", translationError: "This message could not be translated. Please try again.", originalLabel: "Original message", translatedLabel: "Automatic translation", sending: "Sending…", send: "Send", writeMessage: "Write your message…", closeConversation: "This conversation is closed.", translationUnavailable: "Translation has not been configured yet." }
  };
  window.GS_I18N = {
    lang,
    t(key) { return dictionaries[lang]?.[key] || dictionaries.es[key] || key; },
    setLanguage(next) {
      if (!supported.includes(next)) return;
      try { localStorage.setItem("gs-language", next); } catch {}
      const url = new URL(location.href);
      if (/^\/(es|en)(?:\/|$)/.test(url.pathname)) url.pathname = url.pathname.replace(/^\/(es|en)(?=\/|$)/, "/" + next);
      else url.searchParams.set("lang", next);
      location.href = url.toString();
    },
    switcher() {
      const wrap = document.createElement("label");
      wrap.className = "gs-language-switcher";
      wrap.innerHTML = '<select aria-label="' + this.t("language") + '"><option value="es">ES · Español</option><option value="en">EN · English</option></select>';
      const select = wrap.querySelector("select");
      select.value = lang;
      select.addEventListener("change", () => this.setLanguage(select.value));
      return wrap;
    }
  };
})();