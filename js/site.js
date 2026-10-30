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
    utmKeys.forEach(key=>{const input=form.elements[key];if(input)input.value=sessionStorage.getItem(key)|| (key==='utm_source'?'direct':'not_set');});
    const requestId='REQ-'+crypto.randomUUID();form.elements.request_id.value=requestId;
    const direction=params.get('direction');if(direction&&form.elements.direction)form.elements.direction.value=direction;
    const selectedTime=params.get('time');
    if(selectedTime&&form.elements.preferred_time){
      const hour=Number((selectedTime.match(/\b(\d{1,2}):/)||[])[1]);
      const weekend=/суббота|воскресенье/i.test(selectedTime);
      form.elements.preferred_time.value=weekend?'weekend':hour<12?'morning':hour<18?'day':'evening';
    }
    form.addEventListener('submit',async function(event){
      event.preventDefault();
      const message=form.querySelector('.form-message');
      const phone=form.elements.phone.value.replace(/[\s()-]/g,'');
      const name=form.elements.name.value.trim();
      const consent=form.elements.consent.checked;
      if(name.length<2||name.length>60){message.textContent='Введите имя от 2 до 60 символов.';track('form_error',{field_name:'name',error_type:'validation'});return;}
      if(!/^\+7\d{10}$/.test(phone)){message.textContent='Укажите телефон в формате +7 и ещё 10 цифр.';track('form_error',{field_name:'phone',error_type:'validation'});return;}
      if(form.elements.email.value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value)){message.textContent='Проверьте адрес электронной почты.';track('form_error',{field_name:'email',error_type:'validation'});return;}
      if(!consent){message.textContent='Чтобы отправить заявку, подтвердите согласие на обработку данных.';track('form_error',{field_name:'consent',error_type:'validation'});return;}
      form.elements.phone.value=phone;
      const endpoint=window.KVARCIT_LEAD_ENDPOINT;
      if(!endpoint){message.textContent='Форма готова, но приёмник заявок ещё не подключён. Подключим его после настройки Google Таблицы.';track('form_error',{field_name:'form',error_type:'server'});return;}
      const submit=form.querySelector('[type=submit]');submit.disabled=true;message.textContent='Отправляем заявку…';
      try{
        const response=await fetch(endpoint,{method:'POST',body:new URLSearchParams(new FormData(form))});
        const result=await response.json();
        if(!response.ok||!result.ok)throw new Error(result.error||'server');
        track('generate_lead',{lead_direction:form.elements.direction.value,lead_source:form.elements.utm_source.value});
        sessionStorage.setItem('kvarcit_request_id',requestId);location.href='thanks.html';
      }catch(error){message.textContent='Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';submit.disabled=false;track('form_error',{field_name:'form',error_type:'server'});}
    });
  }
  const requestOut=document.querySelector('[data-request-id]');
  if(requestOut)requestOut.textContent=sessionStorage.getItem('kvarcit_request_id')||'будет присвоен после подключения формы';
})();
