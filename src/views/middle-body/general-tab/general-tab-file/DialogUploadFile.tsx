import { useRef, useState, DragEvent, ChangeEvent } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";
import { dataUrlToFile } from "@/resources/services/helper-service";
import { backendService } from "@/resources/services/backend-service";

/**
 * Replace a file object's content: a drop zone that takes one file, optional
 * image compression, and a save that writes the bytes onto the selected object
 * and PATCHes it.
 *
 * Compression is offered only for images, and its parameters are sent as query
 * options on the save so the server does the resizing.
 */
export default function DialogUploadFile({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const obj = useSelectedObjectStore((s) => s.selectedObject);
  const commitSelected = useSelectedObjectStore((s) => s.commitSelected);

  const [file, setFile] = useState<File | null>(null);
  const [compress, setCompress] = useState(false);
  const [targetWidth, setTargetWidth] = useState<number>(100);
  const [quality, setQuality] = useState<number>(100);
  const [disableCompress, setDisableCompress] = useState(true);
  const [targetWidthError, setTargetWidthError] = useState("");
  const [qualityError, setQualityError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /** Back to "no file chosen", compression off. */
  function resetState() {
    setFile(null);
    setDisableCompress(true);
    setTargetWidthError("");
    setQualityError("");
    setCompress(false);
  }

  /** Takes the first file only — a file object holds exactly one. */
  function acceptFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const chosen = files[0];
    setFile(chosen);
    // Only images can be resized, so the option is offered only for them.
    setDisableCompress(!chosen.type.startsWith("image/"));
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    acceptFiles(e.target.files);
    // allow re-selecting the same file later
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    acceptFiles(e.dataTransfer.files);
  }

  function validateTargetWidth(value: number) {
    if (value === null || value === undefined || isNaN(Number(value))) {
      setTargetWidthError("Target width is required.");
    } else if (Number(value) <= 0) {
      setTargetWidthError("Must be a number greater than 0.");
    } else {
      setTargetWidthError("");
    }
  }

  function validateQuality(value: number) {
    if (value === null || value === undefined || isNaN(Number(value))) {
      setQualityError("Quality is required.");
    } else if (Number(value) <= 0 || Number(value) > 100) {
      setQualityError("Must be a number between 1 and 100.");
    } else {
      setQualityError("");
    }
  }

  function onCompressToggle(checked: boolean) {
    setCompress(checked);
    if (!checked) {
      setTargetWidthError("");
      setQualityError("");
    } else {
      validateTargetWidth(targetWidth);
      validateQuality(quality);
    }
  }

  function handleClose() {
    resetState();
    onClose();
  }

  /** Read the chosen file as bytes, write them onto the object, and save. */
  function upload() {
    if (!file || !obj) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        setUploading(true);
        const dataURL = reader.result?.toString() ?? "";
        const newFile = await dataUrlToFile(dataURL, file.name, file.type);
        const arrayBuffer = await newFile.arrayBuffer();

        // The server stores file content as a serialised Node Buffer; the
        // compression options ride along and are turned into query parameters
        // by the save.
        const target = obj as unknown as Record<string, unknown>;
        target.data = { type: "Buffer", data: Array.from(new Uint8Array(arrayBuffer)) };
        target.type = newFile.type;
        target.name = newFile.name;
        target.compress = compress;
        target.targetWidth = targetWidth;
        target.quality = quality;

        await backendService.saveSelectedObject();
        // Republish the object so the preview above rebuilds from the new bytes.
        commitSelected();
      } finally {
        setUploading(false);
        handleClose();
      }
    };
  }

  const uploadDisabled = !file || uploading || (compress && (!!targetWidthError || !!qualityError));

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>File: {obj?.name}</DialogTitle>
      <DialogContent>
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          sx={{
            mt: 1,
            p: 3,
            minHeight: 160,
            border: "2px dashed",
            borderColor: dragOver ? "primary.main" : "divider",
            borderRadius: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            cursor: "pointer",
            bgcolor: dragOver ? "action.hover" : "transparent",
          }}
        >
          <CloudUploadIcon fontSize="large" color="action" />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Drop a file here or click to browse
          </Typography>
          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={onInputChange}
          />
        </Box>

        {file && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 1.5 }}
          >
            <Typography variant="body2" noWrap title={file.name}>
              {file.name} ({file.type || "unknown"})
            </Typography>
            <IconButton size="small" onClick={resetState} aria-label="remove file">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}

        {compress && (
          <Stack spacing={2} className="compression-parameters-container" sx={{ mt: 2 }}>
            <TextField
              label="Target Width"
              type="number"
              size="small"
              value={targetWidth}
              error={!!targetWidthError}
              helperText={targetWidthError}
              inputProps={{ min: 1 }}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTargetWidth(v);
                validateTargetWidth(v);
              }}
            />
            <TextField
              label="Quality"
              type="number"
              size="small"
              value={quality}
              error={!!qualityError}
              helperText={qualityError}
              inputProps={{ min: 1, max: 100, step: 1 }}
              onChange={(e) => {
                const v = Number(e.target.value);
                setQuality(v);
                validateQuality(v);
              }}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={compress}
              disabled={disableCompress}
              onChange={(e) => onCompressToggle(e.target.checked)}
            />
          }
          label="Compress Image"
        />
        <Button
          variant="contained"
          onClick={upload}
          disabled={uploadDisabled}
          startIcon={uploading ? <CircularProgress size={16} /> : undefined}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}
