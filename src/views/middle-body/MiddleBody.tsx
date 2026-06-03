import { useEffect } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import GeneralTab from "./general-tab/GeneralTab";

// Ports middle-body.{ts,html}. The tab definitions are copied verbatim from the
// original `tabDefinitions` array (14 rows). visibleTabs is derived from the
// selected object's type; selecting a new object resets the active tab to
// "General" (mirrors initialize()).
const tabDefinitions = [
  {
    label: "General",
    types: [
      "SceneType",
      "Class",
      "RelationClass",
      "Port",
      "Attribute",
      "AttributeType",
      "User",
      "UserGroup",
      "Procedure",
    ],
  },
  {
    label: "Attributes",
    types: ["SceneType", "Class", "RelationClass", "Port"],
  },
  { label: "Classes", types: ["SceneType"] },
  { label: "Relations", types: ["RelationClass"] },
  { label: "Ports", types: ["SceneType", "Class", "RelationClass"] },
  { label: "Reference", types: ["AttributeType"] },
  { label: "Table", types: ["AttributeType"] },
  { label: "RelationClasses", types: ["SceneType"] },
  { label: "Read Right", types: ["UserGroup"] },
  { label: "Write Right", types: ["UserGroup"] },
  { label: "Delete Right", types: ["UserGroup"] },
  { label: "Can Create Instance", types: ["UserGroup"] },
  { label: "User Groups", types: ["User"] },
  { label: "Procedures", types: ["SceneType"] },
];

export default function MiddleBody() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  const type = useSelectedObjectStore((s) => s.type);
  const selectedTab = useSelectedObjectStore((s) => s.selectedTab);
  const setSelectedTab = useSelectedObjectStore((s) => s.setSelectedTab);

  const visibleTabs = tabDefinitions.filter((tab) =>
    type ? tab.types.includes(type) : false,
  );

  // initialize(): when a new object is selected, reset the active tab to General.
  useEffect(() => {
    if (selectedObject) {
      setSelectedTab("General");
    }
  }, [selectedObject?.uuid, setSelectedTab]);

  if (!selectedObject) {
    return null;
  }

  // Guard: if the current tab is not part of the visible set (e.g. after a type
  // change), fall back to the first visible tab so the Tabs control stays valid.
  const activeTab =
    visibleTabs.some((t) => t.label === selectedTab)
      ? selectedTab
      : visibleTabs[0]?.label;

  return (
    <Box>
      <Tabs
        className="tab-bar"
        value={activeTab ?? false}
        onChange={(_e, value) => setSelectedTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {visibleTabs.map((tab) => (
          <Tab key={tab.label} className="tab" label={tab.label} value={tab.label} />
        ))}
      </Tabs>

      <Box className="tab-content" sx={{ mt: 2 }}>
        {activeTab === "General" && <GeneralTab />}
        {activeTab && activeTab !== "General" && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            The “{activeTab}” tab is implemented in a later phase.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
