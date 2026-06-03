import { useCallback, useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  LinearProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { useAuthStore } from "@/resources/store/authStore";
import { useUiStore } from "@/resources/store/uiStore";
import { backendService } from "@/resources/services/backend-service";
import ObjectList from "@/views/object-list/ObjectList";

interface Section {
  type: string;
  label: string;
  load: () => Promise<unknown>;
  adminOnly?: boolean;
}

// Order mirrors left-nav.html (and the default full-reload order in left-nav.ts;
// note Users is loaded last).
const SECTIONS: Section[] = [
  { type: "SceneType", label: "Scene types", load: () => backendService.getSceneTypes() },
  { type: "Class", label: "Classes", load: () => backendService.getClasses() },
  { type: "RelationClass", label: "Relation classes", load: () => backendService.getRelationClasses() },
  { type: "Attribute", label: "Attributes", load: () => backendService.getAttributes() },
  { type: "AttributeType", label: "Attribute types", load: () => backendService.getAttributeTypes() },
  { type: "Port", label: "Ports", load: () => backendService.getPorts() },
  { type: "File", label: "Files", load: () => backendService.getFiles() },
  { type: "Procedure", label: "Procedures", load: () => backendService.getProcedures() },
  { type: "User", label: "Users", load: () => backendService.getUsers(), adminOnly: true },
  { type: "UserGroup", label: "Usergroups", load: () => backendService.getUserGroups(), adminOnly: true },
];

type LoadingMap = Record<string, boolean>;
const ALL_LOADING: LoadingMap = SECTIONS.reduce((acc, s) => {
  acc[s.type] = true;
  return acc;
}, {} as LoadingMap);

// Ports left-nav.{ts,html}: one MUI Accordion per object category, each showing
// a LinearProgress while its list loads then an ObjectList. The "refresh"
// EventAggregator channel is replaced by the uiStore refreshNonce/refreshType.
export default function LeftNav() {
  const [loading, setLoading] = useState<LoadingMap>(ALL_LOADING);
  const isAdmin = useAuthStore((s) => s.currentUser?.isAdmin ?? false);
  const refreshNonce = useUiStore((s) => s.refreshNonce);

  const setLoadingFor = useCallback((type: string, value: boolean) => {
    setLoading((prev) => ({ ...prev, [type]: value }));
  }, []);

  // Ports left-nav.ts refresh(refreshType). A defined refreshType ("Refresh
  // button"/login) does a full reload (resetObjects + every list); undefined
  // (post-save/create) reloads only the currently selected type.
  const refresh = useCallback(
    async (refreshType?: string) => {
      const store = useSelectedObjectStore.getState();
      const currentType = refreshType ? undefined : store.type;

      const section = SECTIONS.find((s) => s.type === currentType);
      if (currentType && section) {
        setLoadingFor(section.type, true);
        await section.load();
        setLoadingFor(section.type, false);
        return;
      }
      if (currentType && !section) {
        // Role (or any non-list type) selected: nothing to reload.
        return;
      }

      // default: full reload
      store.resetObjects();
      setLoading({ ...ALL_LOADING });
      for (const s of SECTIONS) {
        await s.load();
        setLoadingFor(s.type, false);
      }
    },
    [setLoadingFor],
  );

  // Initial load on mount + every refresh trigger. The first run uses the
  // current refreshType from the store (undefined initially -> full reload,
  // matching left-nav attached() -> refresh()).
  const didMount = useRef(false);
  useEffect(() => {
    const refreshType = didMount.current
      ? useUiStore.getState().refreshType
      : undefined;
    didMount.current = true;
    void refresh(refreshType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  return (
    <>
      {SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((section) => (
        <Accordion key={section.type} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{section.label}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {loading[section.type] ? (
              <LinearProgress />
            ) : (
              <ObjectList type={section.type} />
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
