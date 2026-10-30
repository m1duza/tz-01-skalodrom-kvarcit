# События сайта

Все вызовы `gtag('event', ...)` собраны в `js/analytics.js`. Скрипт `js/site.js` вызывает общий метод `KvarcitAnalytics.track()`.

| Событие | Где возникает | Параметры |
|---|---|---|
| `page_view` | `js/analytics.js`, автоматически при загрузке страницы | `page_location`, `page_title` |
| `scroll` | GA4 Enhanced Measurement | `percent_scrolled` |
| `click` | GA4 Enhanced Measurement, внешние ссылки | `link_url`, `outbound` |
| `file_download` | GA4 Enhanced Measurement, PDF-ссылки | `file_name`, `file_extension` |
| `form_start` | GA4 Enhanced Measurement, взаимодействие с формой | `form_id` |
| `form_submit` | GA4 Enhanced Measurement, отправка формы | `form_id` |
| `generate_lead` | `js/site.js`, только после ответа Apps Script `ok: true` | `lead_direction`, `lead_source` |
| `cta_click` | Кнопки записи с `data-event` | `button_name`, `page_section` |
| `view_program` | Карточки направлений | `program_name` |
| `select_tariff` | Карточки тарифов | `tariff_name`, `tariff_price` |
| `price_calc` | Калькулятор цен | `visits_per_week`, `result_tariff` |
| `schedule_filter` | Фильтры расписания | `filter_type`, `filter_value` |
| `faq_open` | Вопросы главной страницы | `question_id` |
| `contact_click` | Телефон и e-mail | `contact_type` |
| `messenger_click` | Telegram и WhatsApp | `messenger` |
| `social_click` | Ссылки на соцсети | `network`, `page_section` |
| `promo_copy` | Кнопка копирования FIRST590 | `promo_code` |
| `form_error` | Ошибки проверки формы или приёмника | `field_name`, `error_type` |
| `map_open` | Ссылка карты | `map_service` |
| `gallery_view` | Нажатие на плитку галереи | `photo_index` |

Пока GA4 не создан, используется заглушка `G-XXXXXXXXXX`; реальные данные не отправляются. После подключения ID события нужно проверить в DebugView и сделать снимки экрана по требованиям задания.
