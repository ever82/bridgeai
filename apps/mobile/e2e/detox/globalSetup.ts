import { detox as detoxGlobals } from 'detox/internals';

export default async function globalSetup() {
  // Detox global setup handles artifact lifecycle
  if (typeof detoxGlobals === 'function') {
    await detoxGlobals.init();
  }
}
