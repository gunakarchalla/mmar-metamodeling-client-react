import { useEffect, useState } from "react";
import { Typography, Stack, Button, Box } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PublishIcon from "@mui/icons-material/Publish";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { fileToBase64 } from "@/resources/services/helper-service";
import FieldsetSection from "@/views/common/FieldsetSection";
import DialogUploadFile from "./general-tab-file/DialogUploadFile";

/**
 * File-only fields: a preview of the stored bytes, their size, and the buttons
 * to download them or replace them with a new upload.
 */

/** How a file object carries its bytes: a serialised Node Buffer. */
interface StoredFile {
  name?: string;
  type?: string;
  data?: { data?: number[] };
}

function formatFileSize(bytes: number): string {
  const units = [
    { limit: 1024 ** 3, suffix: "GB" },
    { limit: 1024 ** 2, suffix: "MB" },
    { limit: 1024, suffix: "KB" },
  ];
  const unit = units.find((u) => bytes >= u.limit);
  return unit ? `${(bytes / unit.limit).toFixed(2)} ${unit.suffix}` : `${bytes} Bytes`;
}

export default function GeneralTabFile() {
  const object = useSelectedObjectStore((s) => s.selectedObject);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const stored = object as StoredFile | null | undefined;
  const bytes = stored?.data?.data;

  // Rebuild a browser File from the stored bytes, and a data URL to display it.
  useEffect(() => {
    let cancelled = false;

    if (!bytes) {
      setFile(null);
      setPreview("");
      return;
    }

    const rebuilt = new File([new Uint8Array(bytes)], stored?.name ?? "file", {
      type: stored?.type,
    });
    setFile(rebuilt);
    void fileToBase64(rebuilt).then((base64) => {
      if (!cancelled) setPreview(`data:image/png;base64,${base64}`);
    });

    return () => {
      cancelled = true;
    };
  }, [bytes, stored?.name, stored?.type]);

  if (!object) return null;

  function downloadFile() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <FieldsetSection legend="File">
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: 1 }}>
        <Typography>Content:</Typography>
        {preview && (
          <Box
            component="img"
            className="image-content"
            src={preview}
            alt="File Image"
            sx={{ maxWidth: 120, maxHeight: 120, objectFit: "contain" }}
          />
        )}
        <Stack spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={downloadFile}
          >
            Download File
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PublishIcon />}
            onClick={() => setUploadOpen(true)}
          >
            Replace File
          </Button>
        </Stack>
      </Stack>

      {bytes && (
        <Typography className="file-size" variant="caption" color="text.secondary">
          Size: {formatFileSize(bytes.length)}
        </Typography>
      )}

      <DialogUploadFile open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </FieldsetSection>
  );
}
