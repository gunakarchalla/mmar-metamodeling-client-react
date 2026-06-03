import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import ParentChildSelect from "@/views/common/ParentChildSelect";

// Ports usergroup-tab: User -> user groups (has_user_group). The "UserGroup"
// pseudo-type routes addChild (selecedObjectAddUserGroup) / removeChild
// (selectedObjectRemoveUserGroup -> User.fromJS + remove_has_user_group_by_uuid).
export default function UserGroupsTab() {
  const selectedObject = useSelectedObjectStore((s) => s.selectedObject);
  return (
    <ParentChildSelect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items={(selectedObject as any)?.has_user_group}
      objecttypetoadd="UserGroup"
      sortable
    />
  );
}
