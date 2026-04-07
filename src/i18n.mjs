const dictionaries = {
  en: {
    boot_title: "BOOT SCREEN",
    terminal_hacksim: "TERMINAL HACKSIM",
    /** Ten noir cyberpunk intros; rotated per session (browser: localStorage). */
    boot_taglines: [
      "The grids went dark, but the truth didn’t vanish — it went behind glass, firewalls, and polite lies. In the rust of the old networks, someone still pays for what’s real; trace is blood, and the terminal doesn’t flinch. Are you the one who can dig down to the truth — or just another ghost in the queue?",
      "Silence in the backbone isn’t peace — it’s a blackout with a spreadsheet. Every dropped packet is a vote for forgetting; every line you type is a small claim that you still give a damn. The machine won’t judge your motives — but the log will remember your choices.",
      "The corps don’t sell truth; they sell uptime. When the lights blink green, assume someone is lying politely — and the cursor is the only witness that doesn’t sign NDAs. If you’re still typing, you’re still dangerous — in the best way.",
      "Routers remember routes you didn’t ask for; logs carry names you didn’t mean to save. If you’re not careful, your convenience becomes a map — and someone else is reading the legend. So ask yourself: who benefits when you stop looking?",
      "Encryption is a promise with a countdown; trust is a warm handshake you can replay. The real question isn’t whether you can break in — it’s what you’re willing to owe when you do. The terminal doesn’t do mercy; it does consequence.",
      "The public net is a stage; the private net is a blade. If you want to stay clean, you learn to walk in shadows that don’t keep receipts — and to type like you mean it. Are you here to perform — or to cut clean?",
      "Heat isn’t noise; it’s consequence. When someone calls you “paranoid,” translate it as “you’re paying attention.” The terminal doesn’t care about your reputation — only your intent. So what are you going to do with it?",
      "Every breach is a story. Every patch is a patch on a story. If you’re here, you already chose the messy side of history — welcome to the work that doesn’t ship in marketing decks. Ready to read between the stack traces?",
      "Data doesn’t rot; it waits — in old drives, cold backups, forgotten APIs. The question isn’t whether it’s still there — it’s whether you’re still willing to look. If you flinch first, the silence wins.",
      "The queue is full of ghosts — people who wanted to be invisible and got their wish. If you’re here to be seen, admit it: you’re not here to win quietly — you’re here to make the truth expensive again. Still in?",
    ],
    ui_label: "UI",
    typing_label: "Typing",
    beep_label: "Beep",
    tutorial_label: "Tutorial",
    current_operation: "Current operation:",
    quit_label: "Quit",
    on: "ON",
    off: "OFF",
    controls_line:
      "Controls: retry | tutorial on/off | reset | quit — screen clears each command; long text is paged (↑↓ Enter Space q).",
    save_path: "Save",
    browser_save_detail: "localStorage key hktm_campaign_save",
    ui_set_pip: "UI set to PIP.",
    ui_set_plain: "UI set to plain.",
    typing_on: "Typing effect enabled.",
    typing_off: "Typing effect disabled.",
    beep_on: "Beep enabled. You should have heard a test tone (Windows uses a short speaker beep).",
    beep_off: "Beep disabled.",
    tutorial_enabled: "Tutorial enabled.",
    tutorial_disabled: "Tutorial disabled.",
    tutorial_off_hint: "Tutorial is off. Use 'tutorial on' to enable it.",
    tutorial_no_steps: "No tutorial steps are defined for this mission yet.",
    campaign_saved_goodbye: "Campaign saved. Goodbye.",
    campaign_reset: "Campaign reset. Starting fresh.",
    mission_resolved_hint: "Mission resolved. Use 'retry' or 'quit'.",
    next_mission_unlocked: "Next mission unlocked.",
    mission_success_interaction_hint:
      "Type chat or info chat for context, or next to continue the campaign.",
    campaign_complete: "Campaign complete. All mission files resolved.",
    mission_failed_retry: "Mission failed. Type 'retry' to restart this mission.",
    session_aborted: "Session aborted.",
    screen_help:
      "Each command clears the screen. Long output is split into pages that fit this terminal; use ↑/↓, Enter/Space (next page), q (exit pager).",
    pager_help_line:
      "Enter / Space / n / PgDn — next   ↑ / p / PgUp — prev   q / Esc — exit to prompt",
    press_enter_continue: "Press Enter to continue…",
    boot_pager_hint: "Enter next page  q exit",
    terminal_loading_kernel:
      "HKTM-UPLINK · kernel %s — initializing secure session…",
    terminal_loading_line_rng: "[ OK ] RNG substrate",
    terminal_loading_line_policy: "[ OK ] Policy mesh",
    terminal_loading_line_handshake: "[ .. ] Handshaking handler relay…",
    terminal_loading_line_channel: "[ OK ] ShadowNet IM channel standby",
    terminal_loading_line_ready: "SESSION READY — awaiting operator",
    terminal_loading_skip_hint: "Enter / Space — fast-forward · Esc — skip",
    chat_incoming_after_boot:
      "You have 1 incoming message.\nType chat to open ShadowNet IM. See info chat for details.",
    chat_incoming_toast_dismiss: "Dismiss",
    brief_slash_hint_terminal:
      "Tip: type /brief in the main terminal to echo this brief in scrollback.",
    brief_slash_hint_chat:
      "Tip: type /brief in ShadowNet IM to re-read this contract in the drawer.",
    brief_slash_unavailable: "No mission brief in this session yet.",
    brief_next_hint_phish_or_compose: "Next: info phishing or mail (bare mail on local for the lure).",
    brief_mail_and_chat_closure:
      "Check mail list for handler comms and intel before you start. chat reopens the full contract anytime.",
    chat_contract_post_m1_congrats:
      "You crushed the staging phish — clean harvest. Handler's crediting your cut-out wallet; payout shows as queued (story-only; sim ledger).",
    chat_contract_post_m1_next_op:
      "New task: that mailbox secret isn't a trophy — it's leverage. Use it to reach a corporate-facing account, download sensitive data, and exfil before they rotate access. Trace budget is still yours to spend.",
    terminal_setup_region_title: "Select uplink region:",
    terminal_setup_region_prompt: "Region number (1–6, Enter for %s): ",
    terminal_setup_region_invalid: "Invalid — enter 1–6, or Enter alone for default.",
    terminal_setup_region_resolved: "Region — %s",
    terminal_setup_codename_prompt: "Operator codename (gray — type to replace, Enter to accept): ",
    splash_press_any_key: "Press any key to start…",
    splash_press_any_key_continue: "Press any key to continue…",
    splash_press_enter_to_start: "Press Enter to start…",
    chat_typing: "Typing",
    chat_quick_replies_header: "Quick replies",
    chat_reply_1_label: "Who are you?",
    chat_reply_1: "Who are you, really?",
    chat_reply_1_response:
      "Procedural alias — you won't find my real name on any ledger. I'm a cut-out between you and the handler. That's the arrangement, and it keeps both of us clean.",
    chat_reply_2_label: "How did you find me?",
    chat_reply_2: "How did you find me?",
    chat_reply_2_response:
      "Amanda — your friend. She passed your handle through a cut-out, said you'd gone dark but might be open to contract work. I verified your red-team history through Orithmic's scraper and pinged. Here we are.",
    chat_reply_3_label: "What's the risk?",
    chat_reply_3: "What happens if I get caught?",
    chat_reply_3_response:
      "Trace hits the ceiling, SOC locks the segment, and your session burns. You lose the contract — no payout, no debrief. The sim resets but the log doesn't forget. Keep your trace low and use cover/spoof when it climbs.",
    chat_exit_standby:
      "Channel on standby. Handler brief is mirrored on your main terminal — type chat anytime to reopen. — %s",
    /** Node chat gate: /exit without /brief — brief follows after Enter → loading → banner. */
    chat_gate_exit_standby:
      "Channel on standby. Handler brief uploads to your main terminal after you continue. Type chat anytime to reopen. — %s",
    /** Node chat gate: /exit after /brief already printed banner in IM. */
    chat_gate_exit_after_brief:
      "Brief's in your terminal. Start with mail — info phishing if you need the theory. — %s",
    chat_im_thread_continue: "— New op (same channel) —",
    m1_help_tier0_footer:
      "ShadowNet IM (chat, then /exit) opens handler comms. Network tools unlock after you deliver the spear-phishing lure.",
    m1_help_tier1_footer:
      "Network tools (scan, probe, connect, enum, exploit, …) unlock after you deliver the spear-phishing lure.",
    m1_tool_lock_tier0:
      "That command is locked until you finish the ShadowNet IM handshake — type chat, then /exit when you're ready.",
    m1_tool_lock_tier1:
      "That command unlocks after you deliver the spear-phishing lure (bare mail on local).",
    m1_info_locked_tier0:
      "That glossary entry is locked for now — try info chat or info help.",
    m1_tutorial_locked_tier0:
      "Tutorial hints unlock after you finish the ShadowNet IM handshake (chat, then /exit).",
  },
  ru: {
    boot_title: "ЗАГРУЗКА",
    terminal_hacksim: "TERMINAL HACKSIM",
    boot_taglines: [
      "Сети потускнели, но правда не исчезла — её спрятали за стеклом, фаерволами и вежливой ложью. В ржавчине старых магистралей всё ещё платят за то, что настоящее; след — это кровь, а терминал не моргает. Ты тот, кто докопается до правды — или очередной призрак в очереди?",
      "Тишина в магистрали — не мир: это блэкаут с таблицей в Excel. Каждый потерянный пакет — голос за забвение; каждая строка, которую ты набираешь, — маленькое утверждение, что тебе ещё не всё равно. Машина не судит мотивы — но журнал помнит выбор.",
      "Корпорации продают не правду — а аптайм. Когда лампочки зелёные, предполагай, что кто-то вежливо врёт — а курсор единственный свидетель без NDA. Если ты всё ещё печатаешь, ты всё ещё опасен — в хорошем смысле.",
      "Маршрутизаторы помнят пути, которых ты не просил; логи хранят имена, которые ты не хотел сохранять. Если не осторожен — удобство станет картой, а легенду читает кто-то другой. Кому выгодно, когда ты перестаёшь смотреть?",
      "Шифрование — обещание с таймером; доверие — тёплое рукопожатие, которое можно воспроизвести. Вопрос не в том, влезешь ли ты — а чем готов заплатить. Терминал не знает милосердия — только последствия.",
      "Публичная сеть — сцена; приватная — лезвие. Хочешь остаться чистым — учись ходить по теням без чеков — и печатать так, как будто это правда. Ты здесь играешь роль — или режешь по сути?",
      "Шум — не помеха; это следствие. Когда тебя называют параноиком, переводи: «ты замечаешь». Терминал не смотрит на репутацию — только на намерение. Что ты с этим сделаешь?",
      "Каждый взлом — история. Каждый патч — заплатка на историю. Если ты здесь, ты уже выбрал неровную сторону хроники — добро пожаловать в работу, которую не покажут в презентации. Готов читать между строчками стека?",
      "Данные не гниют — они ждут: в старых дисках, холодных бэкапах, забытых API. Вопрос не в том, остались ли они — а в том, хочешь ли ты ещё смотреть. Если дрогнул первым — победила тишина.",
      "Очередь полна призраков — тех, кто хотел стать невидимкой и получил желаемое. Если ты здесь, чтобы тебя видели, признай: ты не ради тихой победы — ты ради того, чтобы правда снова стоила дорого. Остаёшься?",
    ],
    ui_label: "ИНТЕРФЕЙС",
    typing_label: "ПЕЧАТЬ",
    beep_label: "ЗВУК",
    tutorial_label: "ОБУЧЕНИЕ",
    current_operation: "Текущая операция:",
    quit_label: "ВЫХОД",
    on: "ВКЛ",
    off: "ВЫКЛ",
    controls_line:
      "Команды: retry | tutorial on/off | reset | quit — экран очищается после команды; длинный текст постранично (↑↓ Enter Пробел q).",
    save_path: "Сохранение",
    browser_save_detail: "localStorage: hktm_campaign_save",
    ui_set_pip: "Интерфейс: PIP.",
    ui_set_plain: "Интерфейс: обычный.",
    typing_on: "Эффект печати включён.",
    typing_off: "Эффект печати выключен.",
    beep_on: "Звук включён. Должен прозвучать тестовый сигнал (в Windows — короткий системный бип).",
    beep_off: "Звук выключен.",
    tutorial_enabled: "Обучение включено.",
    tutorial_disabled: "Обучение выключено.",
    tutorial_off_hint: "Обучение выключено. Включите: 'tutorial on'.",
    tutorial_no_steps: "Для этой миссии пока нет шагов обучения.",
    campaign_saved_goodbye: "Кампания сохранена. До связи.",
    campaign_reset: "Кампания сброшена. Начинаем заново.",
    mission_resolved_hint: "Миссия завершена. Используйте: 'retry' или 'quit'.",
    next_mission_unlocked: "Следующая миссия разблокирована.",
    mission_success_interaction_hint:
      "Введите chat или info chat для контекста, или next для следующей миссии.",
    campaign_complete: "Кампания завершена. Все задания закрыты.",
    mission_failed_retry: "Миссия провалена. Введите 'retry', чтобы начать заново.",
    session_aborted: "Сессия прервана.",
    screen_help:
      "Каждая команда очищает экран. Длинный вывод разбит на страницы; ↑/↓, Enter/Пробел — далее, q — выход из просмотра.",
    pager_help_line:
      "Enter / Пробел / n / PgDn — след. стр.   ↑ / p / PgUp — назад   q / Esc — выход",
    press_enter_continue: "Нажмите Enter, чтобы продолжить…",
    boot_pager_hint: "Enter — след. стр.  q — выход",
    terminal_loading_kernel:
      "HKTM-UPLINK · ядро %s — инициализация защищённой сессии…",
    terminal_loading_line_rng: "[ OK ] Подложка RNG",
    terminal_loading_line_policy: "[ OK ] Policy mesh",
    terminal_loading_line_handshake: "[ .. ] Рукопожатие с handler relay…",
    terminal_loading_line_channel: "[ OK ] Канал ShadowNet IM в ожидании",
    terminal_loading_line_ready: "СЕССИЯ ГОТОВА — ожидание оператора",
    terminal_loading_skip_hint: "Enter / Пробел — ускорение · Esc — пропуск",
    chat_incoming_after_boot:
      "У вас 1 входящее сообщение.\nВведите chat, чтобы открыть ShadowNet IM. Подробности: info chat.",
    chat_incoming_toast_dismiss: "Закрыть",
    brief_slash_hint_terminal:
      "Подсказка: введите /brief в основном терминале, чтобы вывести этот бриф в журнале.",
    brief_slash_hint_chat:
      "Подсказка: введите /brief в ShadowNet IM, чтобы снова открыть контракт в панели.",
    brief_slash_unavailable: "Бриф миссии пока недоступен.",
    brief_next_hint_phish_or_compose: "Дальше: info phishing или mail (голый mail на local для письма).",
    brief_mail_and_chat_closure:
      "Проверьте mail list на письма хэндлера и разведку перед стартом. chat снова открывает полный контракт.",
    chat_contract_post_m1_congrats:
      "Стейджинг-фишинг прошёл чисто — хороший урожай. Хэндлер зачисляет выплату на ваш cut-out-кошелёк; в симе статус «в очереди» (только сюжет).",
    chat_contract_post_m1_next_op:
      "Новая задача: почтовый секрет — не сувенир, а рычаг. Используйте его, чтобы зайти в корпоративную учётку, скачать чувствительные данные и эксфилить до ротации доступа. Бюджет трейса по-прежнему ваш.",
    terminal_setup_region_title: "Выберите регион uplink:",
    terminal_setup_region_prompt: "Номер региона (1–6, Enter — %s): ",
    terminal_setup_region_invalid: "Неверно — введите 1–6 или один Enter для значения по умолчанию.",
    terminal_setup_region_resolved: "Регион — %s",
    terminal_setup_codename_prompt: "Позывной оператора (серый — ввод заменяет, Enter — принять): ",
    splash_press_any_key: "Нажмите любую клавишу, чтобы начать…",
    splash_press_any_key_continue: "Нажмите любую клавишу, чтобы продолжить…",
    splash_press_enter_to_start: "Нажмите Enter, чтобы начать…",
    chat_typing: "Печатает",
    chat_quick_replies_header: "Быстрые ответы",
    chat_reply_1_label: "Кто ты?",
    chat_reply_1: "Кто ты на самом деле?",
    chat_reply_1_response:
      "Процедурный псевдоним — моего настоящего имени нет ни в одном реестре. Я прослойка между тобой и хэндлером. Такой расклад, и он держит нас обоих чистыми.",
    chat_reply_2_label: "Как нашёл меня?",
    chat_reply_2: "Как ты меня нашёл?",
    chat_reply_2_response:
      "Amanda — твоя подруга. Она передала твой хэндл через прослойку, сказала, ты ушёл в тень, но мог бы взяться за контракт. Я проверил твою red-team историю через скрейпер Orithmic и кинул пинг. Мы здесь.",
    chat_reply_3_label: "Какой риск?",
    chat_reply_3: "Что будет, если поймают?",
    chat_reply_3_response:
      "Трейс дойдёт до потолка, SOC закроет сегмент, и сессия сгорит. Контракт потерян — без выплаты, без дебрифа. Симуляция перезапустится, но лог ничего не забывает. Держи трейс низко, используй cover/spoof когда растёт.",
    chat_exit_standby:
      "Канал в ожидании. Бриф хэндлера дублируется в основном терминале — введите chat, чтобы снова открыть. — %s",
    chat_gate_exit_standby:
      "Канал в ожидании. Бриф хэндлера загрузится в основной терминал после продолжения. Введите chat, чтобы снова открыть. — %s",
    chat_gate_exit_after_brief:
      "Бриф уже в терминале. Начинайте с mail — при необходимости theory: info phishing. — %s",
    chat_im_thread_continue: "— Новая задача (тот же канал) —",
    m1_help_tier0_footer:
      "ShadowNet IM (chat, затем /exit) открывает связь с хэндлером. Сетевые команды откроются после доставки фишингового письма.",
    m1_help_tier1_footer:
      "Сетевые команды (scan, probe, connect, enum, exploit, …) откроются после отправки фишингового письма.",
    m1_tool_lock_tier0:
      "Команда откроется после доставки фишингового письма (голый mail на local).",
    m1_tool_lock_tier1:
      "Команда откроется после доставки фишингового письма (mail на local).",
    m1_info_locked_tier0:
      "Эта статья пока недоступна — попробуйте info chat или info help.",
    m1_tutorial_locked_tier0:
      "Подсказки обучения откроются после рукопожатия в ShadowNet IM (chat, затем /exit).",
  },
};

let currentLang = "en";

/** Browser: cycles 0..n-1 on each new page load; Node: random per process. */
const BOOT_TAGLINE_LS_KEY = "hktm_boot_tagline_i";

export function setLanguage(lang) {
  if (lang === "ru" || lang === "en") currentLang = lang;
}

export function getLanguage() {
  return currentLang;
}

/**
 * One tagline per session (cached). Rotates in order across visits in the browser via localStorage.
 * @returns {string}
 */
export function getBootTagline() {
  const arr = dictionaries[currentLang]?.boot_taglines ?? dictionaries.en.boot_taglines;
  if (!arr?.length) return "";
  const n = arr.length;

  if (typeof globalThis.__HKTM_BOOT_TAGLINE_INDEX !== "number") {
    let idx = 0;
    try {
      if (typeof globalThis.localStorage !== "undefined") {
        const prev = parseInt(globalThis.localStorage.getItem(BOOT_TAGLINE_LS_KEY) ?? "0", 10);
        idx = (Number.isFinite(prev) ? prev : 0) % n;
        globalThis.localStorage.setItem(BOOT_TAGLINE_LS_KEY, String((idx + 1) % n));
      } else {
        idx = Math.floor(Math.random() * n);
      }
    } catch {
      idx = Math.floor(Math.random() * n);
    }
    globalThis.__HKTM_BOOT_TAGLINE_INDEX = idx;
  }

  return arr[globalThis.__HKTM_BOOT_TAGLINE_INDEX % n];
}

export function t(key) {
  if (key === "boot_tagline") return getBootTagline();
  return dictionaries[currentLang]?.[key] ?? dictionaries.en[key] ?? key;
}

