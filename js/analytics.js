/* Set window.KVARCIT_GA_ID to the Measurement ID from the GA4 web stream. */
(function(){
  const measurementId = window.KVARCIT_GA_ID || 'G-XXXXXXXXXX';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.KvarcitAnalytics = {
    track: function(name, parameters){ window.gtag('event', name, parameters || {}); }
  };
  if (!measurementId || measurementId.includes('X')) return;
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.appendChild(script);
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
