import { useCallback, useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  LinearProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  LISTED_META_TYPES,
  META_TYPES,
  MetaTypeName,
} from "@/resources/meta-model/meta-types";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useAuthStore } from "@/resources/store/authStore";
import { useUiStore } from "@/resources/store/uiStore";
import { backendService } from "@/resources/services/backend-service";
import ObjectList from "@/views/object-list/ObjectList";

/**
 * The left navigation: one collapsible section per meta type, each showing a
 * progress bar while its objects load and then the list itself.
 *
 * Reloading is driven by the UI store's refresh signal. A signal that names a
 * source ("Refresh button", signing in) reloads everything; an unnamed one —
 * published after a save or a create — reloads only the type being edited, so
 * the rest of the tree is left as it is.
 */

type LoadingByType = Partial<Record<MetaTypeName, boolean>>;

const ALL_LOADING: LoadingByType = Object.fromEntries(
  LISTED_META_TYPES.map((type) => [type, true]),
);

export default function LeftNav() {
  const [loading, setLoading] = useState<LoadingByType>(ALL_LOADING);
  const isAdmin = useAuthStore((s) => s.currentUser?.isAdmin ?? false);
  const refreshNonce = useUiStore((s) => s.refreshNonce);

  const setLoadingFor = useCallback((type: MetaTypeName, value: boolean) => {
    setLoading((prev) => ({ ...prev, [type]: value }));
  }, []);

  const refresh = useCallback(
    async (refreshType?: string) => {
      const store = useSelectedObjectStore.getState();
      const currentType = refreshType ? undefined : store.type;

      if (currentType) {
        // Reload just this one section — but only if it has one. A role, say, is
        // reachable from an attribute type and has no list of its own.
        const type = LISTED_META_TYPES.find((name) => name === currentType);
        if (!type) return;
        setLoadingFor(type, true);
        await backendService.loadObjects(type);
        setLoadingFor(type, false);
        return;
      }

      // Full reload. The sections are independent — each writes its own store
      // collection — so they load concurrently and fill in as they land rather
      // than one after another. Clearing each spinner in its own `finally`
      // (rather than once after `Promise.all`) keeps one failed request from
      // leaving its accordion spinning forever.
      store.resetObjects();
      setLoading({ ...ALL_LOADING });
      await Promise.all(
        LISTED_META_TYPES.map(async (type) => {
          try {
            await backendService.loadObjects(type);
          } finally {
            setLoadingFor(type, false);
          }
        }),
      );
    },
    [setLoadingFor],
  );

  // Load on mount, then on every refresh signal. The first run ignores the
  // store's refresh type so that starting up always does a full load.
  const hasMounted = useRef(false);
  useEffect(() => {
    const refreshType = hasMounted.current ? useUiStore.getState().refreshType : undefined;
    hasMounted.current = true;
    void refresh(refreshType);
    // Re-runs on each refresh signal; `refresh` itself is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  return (
    <>
      {LISTED_META_TYPES.filter((type) => !META_TYPES[type].adminOnly || isAdmin).map((type) => (
        <Accordion
          key={type}
          disableGutters
          // A collapsed section renders nothing at all. MUI's Collapse keeps its
          // children mounted by default, so every section's full list — one row
          // component per object, across all ten types — was live in the tree
          // from the moment the data landed, and re-rendered with it, even
          // though nine of them were folded shut and invisible. Unmounting on
          // exit makes the cost of the left navigation proportional to what the
          // user has actually opened.
          slotProps={{ transition: { unmountOnExit: true } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{META_TYPES[type].label}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {loading[type] ? <LinearProgress /> : <ObjectList type={type} />}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
