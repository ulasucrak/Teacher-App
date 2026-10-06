// Önceki (yarıda kalmış) çalıştırmalardan kalan "E2E Web…" sınıflarını siler.
import { deleteClassesByPrefix } from './support/api';
import { loadE2eEnv } from './support/env';

export default async function globalSetup(): Promise<void> {
  loadE2eEnv();
  const removed = await deleteClassesByPrefix();
  if (removed) console.log(`Önceki çalıştırmalardan kalan ${removed} E2E sınıfı silindi.`);
}
