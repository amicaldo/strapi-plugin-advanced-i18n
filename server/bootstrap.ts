import type { Subscriber } from '@strapi/database/dist/lifecycles';

export default async () => {
  registerLifecycleHooks();
};

function registerLifecycleHooks() {
  const lifecycleHooks: Subscriber[] = require('./db/lifecycles');
  for (const subscriber of lifecycleHooks) {
    strapi.db.lifecycles.subscribe(subscriber);
  }
}
