/* Все вызовы gtag('event', ...) находятся в этом файле (ТЗ 4.3). */
(function(){
  const measurementId = window.KVARCIT_GA_ID;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.KvarcitAnalytics = {
    track: function(name, parameters){ window.gtag('event', name, parameters || {}); }
  };

  if (!measurementId) return;
  if (!/^G-[A-Z0-9]{6,12}$/.test(measurementId)) {
    console.error('Invalid Google Analytics measurement ID:', measurementId);
    return;
  }

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: true });

  // Если стандартный сниппет gtag уже стоит в <head>, второй раз не подключаем.
  const alreadyLoaded = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
  if (!alreadyLoaded) {
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
