(function(){
  const params = new URLSearchParams(location.search);
  const utmKeys = ['utm_source','utm_medium','utm_campaign','utm_content'];
  utmKeys.forEach(key => { if (params.has(key)) sessionStorage.setItem(key, params.get(key)); });
  const track = (name, values) => { if (window.KvarcitAnalytics) window.KvarcitAnalytics.track(name, values); };
  document.querySelectorAll('.gallery-tile').forEach((tile, index) => {
    tile.addEventListener('click', () => track('gallery_view', { photo_index: index + 1 }));
  });
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) toggle.addEventListener('click', function(){
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  const calc = document.querySelector('#visits-per-week');
  if (calc) {
    const output = document.querySelector('#calc-output');
    const update = function(){
      const visits = Math.max(1, Math.min(7, Number(calc.value) || 1));
      calc.value = visits;
      const monthVisits = visits * 4.33;
      const options = [
        {name:'Разовые посещения', price:Math.ceil(monthVisits) * 900},
        {name:'Абонемент на 8 посещений', price:Math.ceil(monthVisits / 8) * 5600},
        {name:'Безлимит на месяц', price:7900}
      ].sort((a,b)=>a.price-b.price);
      output.innerHTML = '<strong>' + options[0].name + '</strong><br>Ориентировочно ' + options[0].price.toLocaleString('ru-RU') + ' ₽ в месяц';
      track('price_calc',{visits_per_week:visits,result_tariff:options[0].name});
    };
    calc.addEventListener('input', update); update();
  }
  const schedule = document.querySelector('#schedule-body');
  if (schedule) {
    const slots = ['11:00','17:00','19:00','20:30'];
    const days = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    const directions = ['Боулдеринг','Трудность с верёвкой','Детская секция'];
    const rows = days.flatMap((day,d)=>slots.map((time,i)=>({day,time,dir:directions[(i+d)%directions.length]})));
    const dayFilter = document.querySelector('#filter-day');
    const dirFilter = document.querySelector('#filter-direction');
    const render = function(){
      const chosenDay = dayFilter.value, chosenDir = dirFilter.value;
      schedule.innerHTML = rows.filter(row=>(!chosenDay||row.day===chosenDay)&&(!chosenDir||row.dir===chosenDir)).map(row=>'<tr><td>'+row.day+'</td><td>'+row.time+'</td><td>'+row.dir+'</td><td><a class="text-link" href="contacts.html?direction='+(row.dir==='Боулдеринг'?'bouldering':row.dir==='Детская секция'?'kids':'top_rope')+'&time='+encodeURIComponent(row.day+' '+row.time)+'" data-event="cta_click" data-button-name="schedule_slot">Записаться →</a></td></tr>').join('');
    };
    [dayFilter,dirFilter].forEach(el=>el.addEventListener('change',function(){track('schedule_filter',{filter_type:el.name,filter_value:el.value||'all'});render();})); render();
  }
  document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async function(){
    const value=button.dataset.copy;
    try{await navigator.clipboard.writeText(value);button.textContent='Скопировано';track('promo_copy',{promo_code:value});}
    catch(e){button.textContent=value;}
  }));
  const form = document.querySelector('#lead-form');
  if (form) {
    const utmDefaults = { utm_source: 'direct', utm_medium: 'none', utm_campaign: 'not_set', utm_content: 'not_set' };
    utmKeys.forEach(key=>{const input=form.elements[key];if(input)input.value=sessionStorage.getItem(key)||utmDefaults[key];});
    const requestId='REQ-'+crypto.randomUUID();form.elements.request_id.value=requestId;
    const direction=params.get('direction');if(direction&&form.elements.direction)form.elements.direction.value=direction;
    const selectedTime=params.get('time');
    if(selectedTime&&form.elements.preferred_time){
      const hour=Number((selectedTime.match(/\b(\d{1,2}):/)||[])[1]);
      const weekend=/суббота|воскресенье/i.test(selectedTime);
      form.elements.preferred_time.value=weekend?'weekend':hour<12?'morning':hour<18?'day':'evening';
    }
    let bridgeFrame = null;
    let bridgeWindow = null;
    let bridgeReady = false;
    let resolveBridgeReady;
    const bridgeReadyPromise = new Promise(resolve => { resolveBridgeReady = resolve; });
    let pendingRequest = null;
    if (window.KVARCIT_LEAD_ENDPOINT) {
      bridgeFrame = document.createElement('iframe');
      bridgeFrame.title = 'Приёмник заявок';
      bridgeFrame.setAttribute('aria-hidden', 'true');
      bridgeFrame.referrerPolicy = 'no-referrer';
      bridgeFrame.tabIndex = -1;
      bridgeFrame.hidden = true;
      const isAppsScriptOrigin = origin => {
        try {
          const host = new URL(origin).hostname;
          return host === 'script.google.com' || host.endsWith('script.googleusercontent.com');
        } catch (error) { return false; }
      };
      window.addEventListener('message', function(event){
        if (!bridgeFrame || !event.data || !isAppsScriptOrigin(event.origin)) return;
        if (event.data.type === 'kvarcit-bridge-ready') {
          bridgeWindow = event.source;
          bridgeReady = true;
          resolveBridgeReady();
          return;
        }
        if (event.source === bridgeWindow && event.data.type === 'kvarcit-lead-result' && pendingRequest && event.data.requestId === pendingRequest.requestId) {
          const request = pendingRequest;
          pendingRequest = null;
          clearTimeout(request.timeout);
          if (event.data.ok) request.resolve(event.data.result || { ok: true });
          else request.reject(new Error(event.data.error || 'server'));
        }
      });
      bridgeFrame.src = window.KVARCIT_LEAD_ENDPOINT;
      document.body.appendChild(bridgeFrame);
    }
    const sendLead = async function(payload){
      if (!bridgeFrame) throw new Error('not_configured');
      if (!bridgeReady) {
        await Promise.race([
          bridgeReadyPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('bridge_timeout')), 15000))
        ]);
      }
      return new Promise((resolve, reject) => {
        if (!bridgeWindow) { reject(new Error('bridge_not_ready')); return; }
        const requestId = payload.request_id;
        const timeout = setTimeout(() => {
          if (pendingRequest && pendingRequest.requestId === requestId) pendingRequest = null;
          reject(new Error('request_timeout'));
        }, 15000);
        pendingRequest = { requestId, resolve, reject, timeout };
        bridgeWindow.postMessage({ type: 'kvarcit-submit', payload }, '*');
      });
    };
    form.addEventListener('submit',async function(event){
      event.preventDefault();
      const message=form.querySelector('.form-message');
      const enteredPhone=form.elements.phone.value;
      const phoneDigits=enteredPhone.replace(/\D/g,'');
      const phone=phoneDigits.length===10
        ? '+7'+phoneDigits
        : phoneDigits.length===11&&(phoneDigits[0]==='7'||phoneDigits[0]==='8')
          ? '+7'+phoneDigits.slice(1)
          : enteredPhone.replace(/[\s()-]/g,'');
      const name=form.elements.name.value.trim();
      const consent=form.elements.consent.checked;
      if(name.length<2||name.length>60){message.textContent='Введите имя от 2 до 60 символов.';track('form_error',{field_name:'name',error_type:'validation'});return;}
      if(!/^\+7\d{10}$/.test(phone)){message.textContent='Укажите российский номер: 8 900 000-00-00 или +7 900 000-00-00.';track('form_error',{field_name:'phone',error_type:'validation'});return;}
      if(form.elements.email.value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value)){message.textContent='Проверьте адрес электронной почты.';track('form_error',{field_name:'email',error_type:'validation'});return;}
      if(!consent){message.textContent='Чтобы отправить заявку, подтвердите согласие на обработку данных.';track('form_error',{field_name:'consent',error_type:'validation'});return;}
      form.elements.phone.value=phone;
      const endpoint=window.KVARCIT_LEAD_ENDPOINT;
      if(!endpoint){message.textContent='Форма готова, но приёмник заявок ещё не подключён. Подключим его после настройки Google Таблицы.';track('form_error',{field_name:'form',error_type:'server'});return;}
      const submit=form.querySelector('[type=submit]');submit.disabled=true;message.textContent='Отправляем заявку…';
      try{
        const values=Object.fromEntries(new FormData(form).entries());
        values.phone=phone;
        values.page_url=location.origin+location.pathname;
        values.consent=consent;
        const result=await sendLead(values);
        if(!result.ok)throw new Error(result.error||'server');
        track('generate_lead',{lead_direction:form.elements.direction.value,lead_source:form.elements.utm_source.value});
        sessionStorage.setItem('kvarcit_request_id',requestId);location.href='thanks.html';
      }catch(error){message.textContent='Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';submit.disabled=false;track('form_error',{field_name:'form',error_type:'server'});}
    });
  }
  const requestOut=document.querySelector('[data-request-id]');
  if(requestOut)requestOut.textContent=sessionStorage.getItem('kvarcit_request_id')||'будет присвоен после подключения формы';
})();
