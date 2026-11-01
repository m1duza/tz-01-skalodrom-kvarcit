/* Все вызовы gtag('event', ...) находятся в этом файле (ТЗ 4.3). */
(function(){
  const PLACEHOLDER = 'G-KMX8WSYJSX';
  const measurementId = window.KVARCIT_GA_ID || 'G-KMX8WSYJSX';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.KvarcitAnalytics = {
    track: function(name, parameters){ window.gtag('event', name, parameters || {}); }
  };

  // ID считается заглушкой только если он в точности равен шаблону
  // или не похож на идентификатор GA4 (G- и 6–12 букв/цифр).
  if (measurementId === PLACEHOLDER || !/^G-[A-Z0-9]{6,12}$/.test(measurementId)) return;

  // Если стандартный сниппет gtag уже стоит в <head>, второй раз не подключаем.
  const alreadyLoaded = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
  if (!alreadyLoaded) {
    window.gtag('js', new Date());
    // Для проверки в DebugView временно замените на { debug_mode: true }.
    // Перед сдачей верните как ниже (ТЗ 4.6).
    window.gtag('config', measurementId, { send_page_view: true });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  document.addEventListener('click', function(event){
    const target = event.target.closest('[data-event]');
    if (!target) return;
    const parameters = {};
    for (const [key, value] of Object.entries(target.dataset)) {
      if (key !== 'event') parameters[key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase())] = value;
    }
    window.KvarcitAnalytics.track(target.dataset.event, parameters);
  });
})();
