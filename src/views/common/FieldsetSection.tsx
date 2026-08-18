import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

/**
 * A titled, bordered group of form controls — the frame the General tab puts
 * around each block of fields (coordinates, the per-type extras, the child
 * tables). Rendered as a real `<fieldset>`/`<legend>` pair so the title is
 * announced as the group's name.
 */
export default function FieldsetSection({
  legend,
  children,
  dense = false,
  className,
}: {
  legend: string;
  children: ReactNode;
  /** Tighter padding, for the coordinate rows stacked inside the form. */
  dense?: boolean;
  className?: string;
}) {
  return (
    <Box
      component="fieldset"
      className={className}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: dense ? 1.5 : 2,
        mt: dense ? 0 : 2,
        minWidth: 0,
      }}
    >
      <Typography component="legend" variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
        {legend}
      </Typography>
      {children}
    </Box>
  );
}
