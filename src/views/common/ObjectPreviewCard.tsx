import { Box, Card, CardContent, Tooltip } from "@mui/material";
import { vizRepIconOf } from "@/resources/services/vizrep-icon";

/**
 * The small card that stands for a single referenced object: its VizRep icon
 * above its name, with the full name on hover. Used wherever the General tab
 * shows *which* object a field points at — an attribute's type, a relation
 * class's bendpoint.
 */
export default function ObjectPreviewCard({
  name,
  geometry,
}: {
  name: string | undefined;
  /** The referenced object's VizRep source, which the icon is taken from. */
  geometry: unknown;
}) {
  const image = vizRepIconOf(geometry);

  return (
    <Tooltip title={name ?? ""} arrow>
      <Card className="object-card" sx={{ width: 120 }}>
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: 1,
            "&:last-child": { pb: 1 },
          }}
        >
          {image && (
            <Box
              component="img"
              src={image}
              alt={name}
              sx={{ width: 40, height: 40, objectFit: "contain" }}
            />
          )}
          <Box sx={{ fontSize: 12, mt: 0.5, textAlign: "center" }}>{name}</Box>
        </CardContent>
      </Card>
    </Tooltip>
  );
}
