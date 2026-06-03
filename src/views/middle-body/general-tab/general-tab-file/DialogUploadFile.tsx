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
import { HelperService } from "@/resources/services/helper-service";
import { backendService } from "@/resources/services/backend-service";

const helperService = new HelperService();

// Ports dialog-upload-file.{ts,html}. Replaces the Uppy Dashboard with a
// self-contained MUI dropzone (native <input type="file"> + HTML5 drag/drop) —
// no extra dependency (lighter than Uppy, recorded in state.json.sharedMemory).
//
// Parity preserved: single-file restriction, image-only compression options
// (targetWidth/quality, defaults 100) with validation, conversion to a DataURL
// then to bytes via the reused HelperService, writing into
// selectedObject.data.data plus type/name/compress/targetWidth/quality, and
// finally backendService.saveSelectedObject() (the ?compress=... query is
// already handled there).
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

  // mirrors uppy file-removed: reset compression state.
  function resetState() {
    setFile(null);
    setDisableCompress(true);
    setTargetWidthError("");
    setQualityError("");
    setCompress(false);
  }

  // mirrors validateFile(): only images can be compressed.
  function validateFile(f: File) {
    setDisableCompress(!f.type.startsWith("image/"));
  }

  // single-file restriction (maxNumberOfFiles: 1).
  function acceptFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setFile(f);
    validateFile(f);
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

  // mirrors compressChanged(): reset errors when off, validate when on.
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

  // mirrors upload(): DataURL -> File -> bytes, write onto selectedObject, save.
  function upload() {
    if (!file || !obj) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        setUploading(true);
        const dataURL = reader.result?.toString() ?? "";
        const newFile = await helperService.DataUrltoFile(dataURL, file.name, file.type);
        const arrayBuffer = await newFile.arrayBuffer();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const o = obj as any;
        if (!o.data) o.data = { type: "Buffer", data: [] };
        o.data.data = Array.from(new Uint8Array(arrayBuffer));
        o.type = newFile.type;
        o.name = newFile.name;
        o.compress = compress;
        o.targetWidth = targetWidth;
        o.quality = quality;

        await backendService.saveSelectedObject();
        // re-ref selectedObject so GeneralTabFile rebuilds the preview
        // (replaces the original SelectedObjectChanged publish).
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
