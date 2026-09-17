import type { Express } from 'express';
import { registerCrmContactRoutes, type ContactRegistration } from './crm-core-handler';

/** Catálogo inyectado por montaje atribuido; importar este módulo no activa ninguna partición. */
const registrations = new WeakMap<object, ContactRegistration>();
const installed = new WeakSet<object>();
export function registerContactRuntime(app: Pick<Express, 'get' | 'post' | 'patch' | 'delete'>, registration?: ContactRegistration): void {
  if (registration) registrations.set(app, registration); else registrations.delete(app);
  if (!installed.has(app)) {
    registerCrmContactRoutes(app, () => contactRuntime(app));
    installed.add(app);
  }
}
export function contactRuntime(app: object): ContactRegistration | undefined { return registrations.get(app); }
