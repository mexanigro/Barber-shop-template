import { useCallback, useEffect, useRef, useState } from "react";
import type { Customer } from "../types";
import { customerService } from "../services/customers";
import { TOUR_CONFIG } from "../config/tour.config";
import { DEMO_CUSTOMERS } from "../config/demo-data";

/** Conserva la última lectura y distingue un fallo de una lista vacía válida. */
export function useCustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    try {
      const list = TOUR_CONFIG.isDemoMode ? DEMO_CUSTOMERS : await customerService.listCustomers();
      if (current === generation.current) {
        setCustomers(list);
        setError(false);
      }
      return list;
    } catch (cause) {
      if (current === generation.current) setError(true);
      throw cause;
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => { /* El estado error conserva el fallo para la UI. */ });
    return () => { generation.current++; };
  }, [refresh]);

  return { customers, setCustomers, loading, error, refresh };
}
