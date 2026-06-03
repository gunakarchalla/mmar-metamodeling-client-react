import { Box, Typography, Link } from "@mui/material";

// Mirrors footer.html: centered copyright + GitHub badge. Otherwise an inert stub.
export default function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{
        textAlign: "center",
        py: 1,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        © 2025 University of Fribourg. Licensed under the GNU AGPLv3. See{" "}
        <Link href="https://www.gnu.org/licenses/" target="_blank" rel="noopener">
          https://www.gnu.org/licenses/
        </Link>
        .{" "}
        <Link href="https://github.com/MM-AR/mmar" target="_blank" rel="noopener">
          <img
            src="https://img.shields.io/badge/GitHub-MM--AR%2Fmmar-blue"
            alt="GitHub Badge"
            style={{ verticalAlign: "middle" }}
          />
        </Link>
      </Typography>
    </Box>
  );
}
