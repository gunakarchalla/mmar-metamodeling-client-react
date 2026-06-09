import { useState, MouseEvent } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Icon,
  Box,
  Tooltip,
  IconButton,
} from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import RefreshIcon from "@mui/icons-material/Refresh";
import BugReportIcon from "@mui/icons-material/BugReport";
import SaveIcon from "@mui/icons-material/Save";
import { useAuthStore } from "@/resources/store/authStore";
import { useLogStore } from "@/resources/store/logStore";
import { useUiStore } from "@/resources/store/uiStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { backendService } from "@/resources/services/backend-service";

interface MenuItemDef {
  label: string;
  icon: string;
  disabled?: boolean;
}
interface MenuDef {
  name: string;
  icon: string;
  items: MenuItemDef[];
}

// Static, fully-disabled top menus (parity with top-nav-bar.ts). They open but
// every item is inert — no dead logic is re-implemented (decided scope).
const MENUS: MenuDef[] = [
  {
    name: "File",
    icon: "folder",
    items: [
      { label: "Save SceneInstance", icon: "save", disabled: true },
      { label: "Save SceneInstance As", icon: "save_as", disabled: true },
      { label: "Export SceneInstance As", icon: "folder_special", disabled: true },
      { label: "Load SceneInstance", icon: "upload", disabled: true },
    ],
  },
  {
    name: "View",
    icon: "visibility",
    items: [
      { label: "Zoom In", icon: "zoom_in", disabled: true },
      { label: "Zoom Out", icon: "zoom_out", disabled: true },
      { label: "Zoom to Fit", icon: "zoom_out_map", disabled: true },
      { label: "Zoom to Selection", icon: "center_focus_strong", disabled: true },
    ],
  },
  {
    name: "Edit",
    icon: "edit",
    items: [
      { label: "Undo", icon: "undo", disabled: true },
      { label: "Redo", icon: "redo", disabled: true },
      { label: "Copy", icon: "file_copy", disabled: true },
      { label: "Paste", icon: "content_paste", disabled: true },
      { label: "Cut", icon: "content_cut", disabled: true },
    ],
  },
  {
    name: "Diagram",
    icon: "schema",
    items: [
      { label: "Check Rule Current Object", icon: "rule", disabled: true },
      { label: "Check Rule For Model", icon: "rule_folder", disabled: true },
      { label: "...", icon: "folder", disabled: true },
    ],
  },
  {
    name: "Settings",
    icon: "settings",
    items: [{ label: "Open Settings", icon: "toggle_on", disabled: true }],
  },
  {
    name: "Algorithms",
    icon: "functions",
    items: [{ label: "Run Algorithm", icon: "play_arrow", disabled: true }],
  },
];

function MenuEntry({ menu }: { menu: MenuDef }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  return (
    <>
      <Button
        color="inherit"
        startIcon={<Icon>{menu.icon}</Icon>}
        onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
      >
        {menu.name}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {menu.items.map((item) => (
          <MenuItem key={item.label} disabled={item.disabled}>
            <ListItemIcon>
              <Icon>{item.icon}</Icon>
            </ListItemIcon>
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

interface Props {
  onOpenLogin: () => void;
}

// Replaces top-nav-bar + toolbar-container. The toolbar buttons mirror
// toolbar-container.ts: Undo/Redo disabled, Refresh -> global refresh, Test
// (admin only) -> console.log selected object, Save -> persist + refresh.
export default function TopNavBar({ onOpenLogin }: Props) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const log = useLogStore((s) => s.log);
  const triggerRefresh = useUiStore((s) => s.triggerRefresh);

  async function handleSave() {
    await backendService.saveSelectedObject();
    triggerRefresh();
  }

  function handleTest() {
    console.log(
      "Currently selected object : ",
      useSelectedObjectStore.getState().selectedObject,
    );
  }

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <Typography variant="h6" noWrap sx={{ mr: 2 }}>
          MMAR Metamodeling Client
        </Typography>

        <Box sx={{ display: "flex", flexGrow: 1 }}>
          {MENUS.map((menu) => (
            <MenuEntry key={menu.name} menu={menu} />
          ))}
        </Box>

        {/* Toolbar (toolbar-container parity) */}
        <Tooltip title="undo">
          <span>
            <IconButton disabled onClick={() => log("undo", "info")}>
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="redo">
          <span>
            <IconButton disabled onClick={() => log("redo", "info")}>
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="refresh">
          <IconButton onClick={() => triggerRefresh("Refresh button")}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        {currentUser?.isAdmin && (
          <IconButton onClick={handleTest}>
            <BugReportIcon />
          </IconButton>
        )}
        <Tooltip title="save">
          <IconButton onClick={handleSave}>
            <SaveIcon />
          </IconButton>
        </Tooltip>

        {currentUser ? (
          <>
            <Typography variant="body2" sx={{ mx: 1 }}>
              {currentUser.username}
            </Typography>
            <Button color="inherit" variant="outlined" onClick={() => logout()}>
              Sign Out
            </Button>
          </>
        ) : (
          <Button color="inherit" variant="outlined" onClick={onOpenLogin}>
            Sign In
          </Button>
        )}

        <img
          alt="UnifrLogo"
          style={{ height: 36, marginLeft: 12 }}
          src="//cdn.unifr.ch/uf/v2.4.5/gfx/logo.png"
        />
      </Toolbar>
    </AppBar>
  );
}
