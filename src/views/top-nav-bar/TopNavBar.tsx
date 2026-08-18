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
} from "@mui/material";
import { useAuthStore } from "@/resources/store/authStore";
import {
  selectCanRedo,
  selectCanUndo,
  useSelectedObjectStore,
} from "@/resources/store/selectedObjectStore";

interface MenuItemDef {
  label: string;
  icon: string;
  disabled?: boolean;
  /** Items that do something name a store action; the rest are placeholders. */
  action?: "undo" | "redo";
}
interface MenuDef {
  name: string;
  icon: string;
  items: MenuItemDef[];
}

/**
 * The menu bar. Undo and Redo under Edit share the toolbar arrows' per-tab
 * history; every other item is a placeholder for functionality this client does
 * not implement, kept visible so the menus match the modelling client's.
 */
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
      { label: "Undo", icon: "undo", action: "undo" },
      { label: "Redo", icon: "redo", action: "redo" },
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
];

function MenuEntry({ menu }: { menu: MenuDef }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Looked up by name so these hooks stay unconditional — a menu with no live
  // item simply ignores them. Booleans, so a menu re-renders only when a step
  // becomes available or stops being so.
  const enabled = {
    undo: useSelectedObjectStore(selectCanUndo),
    redo: useSelectedObjectStore(selectCanRedo),
  };
  const run = {
    undo: useSelectedObjectStore((s) => s.undo),
    redo: useSelectedObjectStore((s) => s.redo),
  };

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
          <MenuItem
            key={item.label}
            disabled={item.action ? !enabled[item.action] : item.disabled}
            onClick={
              item.action
                ? () => {
                    run[item.action!]();
                    setAnchorEl(null);
                  }
                : undefined
            }
          >
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

/**
 * The top bar: the application title, the menus, and the sign-in/sign-out
 * controls. The action buttons live in their own row below so the title still
 * fits on a laptop screen.
 */
export default function TopNavBar({ onOpenLogin }: Props) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <Typography variant="h6" noWrap sx={{ mr: 2 }}>
          MMAR Metamodeling Client
        </Typography>

        <Box sx={{ display: "flex", flexGrow: 1 }}>
          {MENUS.map((menu) => (
            <MenuEntry key={menu.name} menu={menu} />
          ))}
        </Box>

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
