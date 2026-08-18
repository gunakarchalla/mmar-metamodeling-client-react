import { Box, Tabs, Tab } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ObjectTabs from "@/views/object-tabs/ObjectTabs";
import GeneralTab from "./general-tab/GeneralTab";
import StructuralTab from "./structural-tabs/StructuralTab";
import { TAB_DEFINITIONS } from "./tab-definitions";

/**
 * The editor for whichever object is selected: the strip of open objects, the
 * row of sub-tabs valid for that object's type, and the active sub-tab's
 * content.
 */

export default function MiddleBody() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  const type = useSelectedObjectStore((s) => s.type);
  const selectedTab = useSelectedObjectStore((s) => s.selectedTab);
  const setSelectedTab = useSelectedObjectStore((s) => s.setSelectedTab);

  // Nothing selected: the tab strip alone (empty, so nothing renders at all).
  if (!selectedObject) return <ObjectTabs />;

  const visibleTabs = TAB_DEFINITIONS.filter((tab) => !!type && tab.types.includes(type));

  // Which sub-tab a newly opened tab starts on, and which one re-focusing an
  // existing tab restores, is decided by the store. Falling back to the first
  // visible tab keeps the control valid if the remembered one does not apply to
  // this object's type.
  const activeTab =
    visibleTabs.find((tab) => tab.label === selectedTab) ?? visibleTabs[0];

  return (
    <Box>
      <ObjectTabs />

      <Tabs
        className="tab-bar"
        value={activeTab?.label ?? false}
        onChange={(_event, value) => setSelectedTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {visibleTabs.map((tab) => (
          <Tab key={tab.label} className="tab" label={tab.label} value={tab.label} />
        ))}
      </Tabs>

      <Box className="tab-content" sx={{ mt: 2 }}>
        {activeTab?.label === "General" ? (
          <GeneralTab />
        ) : (
          activeTab && <StructuralTab lists={activeTab.lists} />
        )}
      </Box>
    </Box>
  );
}
