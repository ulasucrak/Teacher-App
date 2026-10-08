import type { SymbolViewProps } from 'expo-symbols';

/** iOS'ta SF Symbols, Android ve web'de Material Symbols adı. */
export type SymbolName = Exclude<SymbolViewProps['name'], string>;

/**
 * Uygulamada kullanılan ikonlar: iOS'ta SF Symbols, Android'de Material Symbols.
 * Yeni ad eklerken iki platformu da verin; web, Android (Material Symbols) adını kullanır.
 */
export const icons = {
  back: { ios: 'chevron.left', android: 'arrow_back' },
  search: { ios: 'magnifyingglass', android: 'search' },
  edit: { ios: 'pencil', android: 'edit' },
  note: { ios: 'note.text', android: 'sticky_note_2' },
  check: { ios: 'checkmark', android: 'check' },
  close: { ios: 'xmark', android: 'close' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  plusMinus: { ios: 'plusminus', android: 'exposure' },
  speech: { ios: 'bubble.left', android: 'chat_bubble' },
  camera: { ios: 'camera', android: 'photo_camera' },
  photo: { ios: 'photo', android: 'image' },
  info: { ios: 'info.circle', android: 'info' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning' },
  error: { ios: 'exclamationmark.circle', android: 'error' },
  success: { ios: 'checkmark.circle', android: 'check_circle' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  people: { ios: 'person.2', android: 'group' },
  person: { ios: 'person', android: 'person' },
  book: { ios: 'book.closed', android: 'menu_book' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  trash: { ios: 'trash', android: 'delete' },
  eye: { ios: 'eye', android: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off' },
  mail: { ios: 'envelope', android: 'mail' },
  lock: { ios: 'lock', android: 'lock' },
  paste: { ios: 'doc.on.clipboard', android: 'content_paste' },
  keyboard: { ios: 'keyboard', android: 'keyboard' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  archive: { ios: 'archivebox', android: 'archive' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  checklist: { ios: 'checklist', android: 'checklist' },
  list: { ios: 'list.bullet', android: 'format_list_bulleted' },
  settings: { ios: 'gearshape', android: 'settings' },
  pencil: { ios: 'pencil.line', android: 'stylus' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof icons;

/** Web'de SymbolView `web` anahtarını okur; Android'deki Material Symbols adını kullanırız. */
export function toWebSymbol(symbol: SymbolName): SymbolName {
  return { ...symbol, web: symbol.web ?? symbol.android };
}
