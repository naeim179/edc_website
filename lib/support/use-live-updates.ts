"use client";

import { useEffect, useRef } from "react";
import type { SupportAdapter } from "./types";
import { watchSupportView } from "./live-updates";

export function useSupportLiveUpdates(api: SupportAdapter, ticketId: string | undefined, refresh: () => Promise<void>) {
  const currentRefresh = useRef(refresh);
  useEffect(() => { currentRefresh.current = refresh; }, [refresh]);
  useEffect(() => watchSupportView(api, ticketId, () => currentRefresh.current()), [api, ticketId]);
}
