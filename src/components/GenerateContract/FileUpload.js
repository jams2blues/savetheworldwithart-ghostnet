/*Developed by @jams2blues with love for the Tezos community
  File: src/components/GenerateContract/FileUpload.js
  Summary: Collection-thumbnail uploader — GLB/GLTF & HTML support,
           20 KB advisory, <model-viewer> preview, correct Data-URI MIME fix.
*/

import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Snackbar,
  Alert,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';

/*──────────────────────── Accepted types & extensions ───────────────*/
const MIME_TYPES = [
  'image/bmp','image/gif','image/jpeg','image/png','image/apng','image/svg+xml','image/webp',
  'video/mp4','video/ogg','video/quicktime','video/webm',
  'model/gltf-binary','model/gltf+json','model/gltf','application/octet-stream',
  'audio/mpeg','audio/ogg','audio/wav','audio/wave','audio/x-pn-wav',
  'audio/vnd.wave','audio/x-wav','audio/flac',
  'application/pdf','application/zip','application/x-zip-compressed','multipart/x-zip',
  'text/plain','application/json','text/html',
];
const EXTENSIONS = ['.glb', '.gltf', '.html'];
const ACCEPT_ATTR = [...MIME_TYPES, ...EXTENSIONS].join(',');

/*──────────────────────── Limits & helpers ──────────────────────────*/
const RAW_WARN = 20 * 1024; // 20 KB advisory
const extOf = (f) => (f?.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
const okFile = (f) =>
  MIME_TYPES.includes(f.type) || EXTENSIONS.includes(extOf(f)) || f.type === '';
const bytesOfB64 = (uri) => {
  const b = uri.split(',')[1] || '';
  const pad = (b.match(/=+$/) || [''])[0].length;
  return Math.floor((b.length * 3) / 4) - pad;
};
const isImage = (f) => f?.type.startsWith('image/');
const isModel = (f) =>
  ['model/gltf-binary','model/gltf','application/octet-stream'].includes(f?.type) ||
  ['.glb','.gltf'].includes(extOf(f));

/*──────────────────────── Component ────────────────────────────────*/
const FileUpload = ({ setArtifactData }) => {
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'info' });
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const theme = useTheme();
  const sm = useMediaQuery(theme.breakpoints.down('sm'));
  const inputRef = useRef(null);

  /* inject <model-viewer> once client-side */
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.customElements?.get('model-viewer')) {
      const s = document.createElement('script');
      s.type = 'module'; s.async = true; s.crossOrigin = 'anonymous';
      s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(s);
    }
  }, []);

  const close = () => setSnack(p => ({ ...p, open: false }));

  const handleChange = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!okFile(f)) {
      setSnack({ open: true, msg: 'Unsupported file type.', sev: 'error' });
      e.target.value = null; return;
    }
    if (f.size > RAW_WARN) {
      setSnack({ open: true, msg: 'Raw file > 20 KB – consider compression.', sev: 'warning' });
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      let uri = reader.result;
      if (isModel(f) && !uri.startsWith('data:model/')) {
        uri = uri.replace(
          /^data:[^;]+/,
          f.name.toLowerCase().endsWith('.gltf')
            ? 'data:model/gltf+json'
            : 'data:model/gltf-binary'
        );
      }
      if (bytesOfB64(uri) > RAW_WARN) {
        setSnack({ open: true, msg: 'Encoded >20 KB – marketplaces may truncate.', sev: 'warning' });
      } else {
        setSnack({ open: true, msg: 'File uploaded.', sev: 'success' });
      }
      setFileName(f.name);
      setFile(f);
      setUploading(false);
      setArtifactData(uri);
    };
    reader.onerror = () => {
      setSnack({ open: true, msg: 'Read error – retry.', sev: 'error' });
      setUploading(false);
    };
    reader.readAsDataURL(f);
  };

  const Preview = () => {
    if (!file || uploading) return null;
    if (isImage(file)) {
      return (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <img
            src={URL.createObjectURL(file)}
            alt="Thumbnail preview"
            style={{
              maxWidth: '100%', maxHeight: 300,
              objectFit: 'contain', borderRadius: 8,
              backgroundColor: '#f5f5f5',
            }}
          />
        </Box>
      );
    }
    if (isModel(file)) {
      return (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          {/* @ts-ignore */}
          <model-viewer
            src={URL.createObjectURL(file)}
            alt="3-D preview"
            camera-controls auto-rotate
            style={{
              width: '100%', height: 300,
              background: '#f5f5f5', borderRadius: 8,
            }}
          />
        </Box>
      );
    }
    if (file.type === 'text/html' || extOf(file) === '.html') {
      return (
        <Box sx={{ mt: 2 }}>
          <iframe
            srcDoc={atob(URL.createObjectURL(file).split(',')[1] || '')}
            title="HTML preview"
            style={{ width: '100%', height: 300, border: 'none', background: '#f5f5f5' }}
          />
        </Box>
      );
    }
    return null;
  };

  return (
    <div>
      <input
        ref={inputRef}
        id="collection-thumbnail-upload"
        type="file"
        accept={ACCEPT_ATTR}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <label htmlFor="collection-thumbnail-upload">
        <Tooltip
          title={
            <div>
              <Typography variant="subtitle2">Disclaimer:</Typography>
              <Typography variant="body2">
                square aspect ratio mandatory for collection thumbnail.
              </Typography>
              <Typography variant="subtitle2">test on ghostnet first</Typography>
            </div>
          }
          arrow
        >
          <span>
            <Button
              variant="contained"
              component="span"
              color="primary"
              startIcon={<ImageIcon />}
              sx={{ mt: 1 }}
              fullWidth={sm}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload Collection Thumbnail'}
            </Button>
          </span>
        </Tooltip>
      </label>

      {fileName && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Selected:</strong> {fileName}
        </Typography>
      )}

      <Preview />

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.sev} onClose={close} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default FileUpload;
