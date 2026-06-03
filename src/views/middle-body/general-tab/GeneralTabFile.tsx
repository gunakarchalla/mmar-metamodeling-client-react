import { useEffect, useState } from "react";
import { Box, Typography, Stack, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PublishIcon from "@mui/icons-material/Publish";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { File as MetaFile } from "@gds/models/meta/Metamodel_files.structure";
import { HelperService } from "@/resources/services/helper-service";

const helperService = new HelperService();

// Ports general-tab-file.{ts,html}: shows the file content as an image preview,
// a Download button, the file size, and a Replace-File button.
//
// NOTE: the upload/replace flow (dialog-upload-file) is implemented in Phase 8;
// the "Replace File" button is a clearly-marked placeholder for now.
export default function GeneralTabFile() {
  const obj = useSelectedObjectStore((s) => s.selectedObject);
  const [imageString, setImageString] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // getFile() + getImage(): rebuild a browser File from the byte data and turn it
  // into a data-url for preview.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!obj) {
        setFile(null);
        setImageString("");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = obj as any;
      const fileData = o?.data?.data;
      if (!fileData) {
        setFile(null);
        setImageString("");
        return;
      }
      const mimeType = o.type;
      const blob = new Blob([new Uint8Array(fileData)], { type: mimeType });
      const f = new File([blob], obj.name ?? "file", { type: mimeType });
      if (cancelled) return;
      setFile(f);
      const base64 = await helperService.FiletoDataUrl(f);
      if (!cancelled) setImageString(`data:image/png;base64,${base64}`);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [obj?.uuid, obj]);

  if (!obj) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = obj as MetaFile & { data?: any };

  function downloadFile() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatFileSize(length: number): string {
    if (length >= 1073741824) return (length / 1073741824).toFixed(2) + " GB";
    if (length >= 1048576) return (length / 1048576).toFixed(2) + " MB";
    if (length >= 1024) return (length / 1024).toFixed(2) + " KB";
    return length + " Bytes";
  }

  return (
    <Box
      component="section"
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, mt: 2 }}
    >
      <Typography component="legend" variant="caption" color="text.secondary">
        File
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
        <Typography>Content:</Typography>
        {imageString && (
          <Box
            component="img"
            className="image-content"
            src={imageString}
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
          <Button variant="outlined" size="small" startIcon={<PublishIcon />} disabled>
            Replace File (Phase 8)
          </Button>
        </Stack>
      </Stack>

      {o.data && o.data.data && (
        <Typography className="file-size" variant="caption" color="text.secondary">
          Size: {formatFileSize(o.data.data.length)}
        </Typography>
      )}
    </Box>
  );
}
