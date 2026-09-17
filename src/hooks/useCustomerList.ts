import { useCallback, useEffect, useRef, useState } from 'react';
import type { Customer } from '../types';
import { customerService, subscribeContactIdentity } from '../services/customers';
import type { ContactCapabilities } from '../services/core-contacts';
import { TOUR_CONFIG } from '../config/tour.config';
import { DEMO_CUSTOMERS } from '../config/demo-data';

/** Lista y capacidades pertenecen al mismo recorrido; invalidar elimina datos anteriores. */
export function useCustomerList(archived: 'active' | 'archived' | 'all' = 'active') {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [capabilities, setCapabilities] = useState<ContactCapabilities | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(false), [scopeVersion, setScopeVersion] = useState(0);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current; setLoading(true);
    try {
      const result = TOUR_CONFIG.isDemoMode ? { customers: DEMO_CUSTOMERS, capabilities: null } : await customerService.listBundle({ archived });
      if (current === generation.current) { setCustomers(result.customers); setCapabilities(result.capabilities); setError(false); }
      return result.customers;
    } catch (cause) {
      if (current === generation.current) setError(true);
      throw cause;
    } finally { if (current === generation.current) setLoading(false); }
  }, [archived]);
  useEffect(() => {
    const clear = () => { generation.current++; setCustomers([]); setCapabilities(null); setScopeVersion(value => value + 1); setLoading(false); setError(true); };
    const off = TOUR_CONFIG.isDemoMode ? () => {} : subscribeContactIdentity(clear);
    void refresh().catch(() => {});
    return () => { off(); generation.current++; };
  }, [refresh]);
  return { customers, setCustomers, capabilities, scopeVersion, loading, error, refresh };
}
