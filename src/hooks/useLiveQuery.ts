import { useState, useEffect } from "react";
import { subscribeToDb } from "../db/db";

export function useLiveQuery<T>(
  querier: () => Promise<T>,
  deps: any[] = [],
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const result = await querier();
        if (isMounted) {
          setData(result);
        }
      } catch (error) {
        console.error("Error in useLiveQuery:", error);
      }
    };

    fetchData();

    // Subscribe to DB changes
    const unsubscribe = subscribeToDb(() => {
      fetchData();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, deps);

  return data;
}
