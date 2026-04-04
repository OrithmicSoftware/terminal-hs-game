const dictionaries = {
  en: {
    boot_title: "BOOT SCREEN",
    terminal_hacksim: "TERMINAL HACKSIM",
    boot_tagline:
      "A fictional ops campaign. No real exploits, no real networks — just strategy, stealth, and story.",
    ui_label: "UI",
    typing_label: "Typing",
    beep_label: "Beep",
    tutorial_label: "Tutorial",
    campaign_board_label: "Campaign board",
    quit_label: "Quit",
    on: "ON",
    off: "OFF",
    controls_line:
      "Controls: campaign | retry | tutorial on/off | reset | quit — screen clears each command; long text is paged (↑↓ Enter Space q).",
    campaign_ops_board: "CAMPAIGN OPS BOARD",
    save_path: "Save",
    ui_set_pip: "UI set to PIP.",
    ui_set_plain: "UI set to plain.",
    typing_on: "Typing effect enabled.",
    typing_off: "Typing effect disabled.",
    beep_on: "Beep enabled. You should have heard a test tone (Windows uses a short speaker beep).",
    beep_off: "Beep disabled.",
    tutorial_enabled: "Tutorial enabled.",
    tutorial_disabled: "Tutorial disabled.",
    tutorial_off_hint: "Tutorial is off. Use 'tutorial on' to enable it.",
    campaign_saved_goodbye: "Campaign saved. Goodbye.",
    campaign_reset: "Campaign reset. Starting fresh.",
    mission_resolved_hint: "Mission resolved. Use 'retry', 'campaign', or 'quit'.",
    next_mission_unlocked: "Next mission unlocked.",
    campaign_complete: "Campaign complete. All mission files resolved.",
    mission_failed_retry: "Mission failed. Type 'retry' to restart this mission.",
    session_aborted: "Session aborted.",
    screen_help:
      "Each command clears the screen. Long output is split into pages that fit this terminal; use ↑/↓, Enter/Space (next page), q (exit pager).",
    pager_help_line:
      "Enter / Space / n / PgDn — next   ↑ / p / PgUp — prev   q / Esc — exit to prompt",
    press_enter_continue: "Press Enter to continue…",
    boot_pager_hint: "Enter/Space next page  q exit"
  },
  ru: {
    boot_title: "ЗАГРУЗКА",
    terminal_hacksim: "TERMINAL HACKSIM",
    boot_tagline:
      "Это вымышленная операция. Никаких реальных эксплойтов и сетей — только стратегия, скрытность и сюжет.",
    ui_label: "ИНТЕРФЕЙС",
    typing_label: "ПЕЧАТЬ",
    beep_label: "ЗВУК",
    tutorial_label: "ОБУЧЕНИЕ",
    campaign_board_label: "ДОСКА КАМПАНИИ",
    quit_label: "ВЫХОД",
    on: "ВКЛ",
    off: "ВЫКЛ",
    controls_line:
      "Команды: campaign | retry | tutorial on/off | reset | quit — экран очищается после команды; длинный текст постранично (↑↓ Enter Пробел q).",
    campaign_ops_board: "ДОСКА ОПЕРАЦИЙ",
    save_path: "Сохранение",
    ui_set_pip: "Интерфейс: PIP.",
    ui_set_plain: "Интерфейс: обычный.",
    typing_on: "Эффект печати включён.",
    typing_off: "Эффект печати выключен.",
    beep_on: "Звук включён. Должен прозвучать тестовый сигнал (в Windows — короткий системный бип).",
    beep_off: "Звук выключен.",
    tutorial_enabled: "Обучение включено.",
    tutorial_disabled: "Обучение выключено.",
    tutorial_off_hint: "Обучение выключено. Включите: 'tutorial on'.",
    campaign_saved_goodbye: "Кампания сохранена. До связи.",
    campaign_reset: "Кампания сброшена. Начинаем заново.",
    mission_resolved_hint: "Миссия завершена. Используйте: 'retry', 'campaign' или 'quit'.",
    next_mission_unlocked: "Следующая миссия разблокирована.",
    campaign_complete: "Кампания завершена. Все задания закрыты.",
    mission_failed_retry: "Миссия провалена. Введите 'retry', чтобы начать заново.",
    session_aborted: "Сессия прервана.",
    screen_help:
      "Каждая команда очищает экран. Длинный вывод разбит на страницы; ↑/↓, Enter/Пробел — далее, q — выход из просмотра.",
    pager_help_line:
      "Enter / Пробел / n / PgDn — след. стр.   ↑ / p / PgUp — назад   q / Esc — выход",
    press_enter_continue: "Нажмите Enter, чтобы продолжить…",
    boot_pager_hint: "Enter/Пробел — след. стр.  q — выход"
  }
};

let currentLang = "en";

export function setLanguage(lang) {
  if (lang === "ru" || lang === "en") currentLang = lang;
}

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  return dictionaries[currentLang]?.[key] ?? dictionaries.en[key] ?? key;
}

