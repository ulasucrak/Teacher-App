import type { SymbolName } from '@/components/ui';

/** Ortak ikon setinde olmayan, yalnızca form ekranlarında gereken ikonlar. */
export const extraIcons = {
  arrowUp: { ios: 'chevron.up', android: 'expand_less' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  archive: { ios: 'archivebox', android: 'archive' },
  unarchive: { ios: 'arrow.uturn.backward', android: 'unarchive' },
  addFromOther: { ios: 'tray.and.arrow.down', android: 'move_to_inbox' },
  list: { ios: 'list.bullet', android: 'list', web: 'format_list_bulleted' },
} satisfies Record<string, SymbolName>;

