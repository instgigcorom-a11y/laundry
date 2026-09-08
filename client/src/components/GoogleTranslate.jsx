import { useEffect } from "react";

let loader;

function loadGoogleTranslate() {
  if (window.google?.translate) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Translate could not load."));
    document.head.appendChild(script);
  });
  return loader;
}

export function GoogleTranslate() {
  useEffect(() => {
    let active = true;
    loadGoogleTranslate().then(() => {
      if (!active || !window.google?.translate || document.querySelector("#google_translate_element select")) return;
      new window.google.translate.TranslateElement({ pageLanguage: "en", includedLanguages: "en,hi,pa", autoDisplay: false }, "google_translate_element");
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <div id="google_translate_element" className="google-translate" aria-label="Translate this page" />;
}
