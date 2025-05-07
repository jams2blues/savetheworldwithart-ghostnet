/*Developed by @jams2blues with love for the Tezos community
  File: src/components/ManageContract/MintUpload.js
  Summary: NFT artifact uploader — handles file selection and data-URL conversion only, no preview logic
*/

import React, { useState, useRef } from 'react';
import { Button, Snackbar, Alert, Typography, Tooltip } from '@mui/material';

/*──────────────────────── Accepted types & extensions ───────────────*/
const MIME_TYPES = [
  'image/bmp','image/gif','image/jpeg','image/png','image/apng','image/svg+xml','image/webp',
  'video/mp4','video/ogg','video/quicktime','video/webm',
  'model/gltf-binary','model/gltf+json','model/gltf','application/octet-stream',
  'audio/mpeg','audio/ogg','audio/wav','audio/wave','audio/x-pn-wav','audio/vnd.wave','audio/x-wav','audio/flac',
  'application/pdf','text/plain','application/json','text/html',
  'application/zip','application/x-zip-compressed','multipart/x-zip',
];
const EXTENSIONS = ['.glb', '.gltf', '.html'];
const ACCEPT_ATTR = [...MIME_TYPES, ...EXTENSIONS].join(',');

/*──────────────────────── Limits & helpers ──────────────────────────*/
const RAW_WARN = 20 * 1024;
const extOf = (f) => (f?.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
const okFile = (f) =>
  MIME_TYPES.includes(f.type) || EXTENSIONS.includes(extOf(f)) || f.type === '';
const bytesOfB64 = (uri) => {
  const b = uri.split(',')[1] || '';
  const pad = (b.match(/=+$/) || [''])[0].length;
  return Math.floor((b.length * 3) / 4) - pad;
};

/*──────────────────────── Component ────────────────────────────────*/
const MintUpload = ({ onFileChange, onFileDataUrlChange }) => {
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'info' });
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const close = () => setSnack(p => ({ ...p, open: false }));

  const handleChange = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!okFile(f)) {
      setSnack({ open: true, msg: 'Unsupported file type.', sev: 'error' });
      e.target.value = null;
      return;
    }
    if (f.size > RAW_WARN) {
      setSnack({ open: true, msg: 'Raw size > 20 KB – consider compression.', sev: 'warning' });
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      let uri = reader.result;
      if (['model/gltf-binary','model/gltf','application/octet-stream'].includes(f.type) || ['.glb','.gltf'].includes(extOf(f))) {
        uri = uri.replace(
          /^data:[^;]+/,
          f.name.toLowerCase().endsWith('.gltf')
            ? 'data:model/gltf+json'
            : 'data:model/gltf-binary'
        );
      }
      if (bytesOfB64(uri) > RAW_WARN) {
        setSnack({ open: true, msg: 'Encoded size > 20 KB – wallets may truncate.', sev: 'warning' });
      } else {
        setSnack({ open: true, msg: 'File uploaded.', sev: 'success' });
      }
      setFileName(f.name);
      setUploading(false);
      onFileChange(f);
      onFileDataUrlChange(uri);
    };
    reader.onerror = () => {
      setSnack({ open: true, msg: 'Read error – try again.', sev: 'error' });
      setUploading(false);
    };
    reader.readAsDataURL(f);
  };

  /*────── UI ─────────────────────────────────────────────────────────*/
  return (
    <div>
      <input
        ref={inputRef}
        id="mint-nft-upload"
        type="file"
        accept={ACCEPT_ATTR}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <label htmlFor="mint-nft-upload">
        <Tooltip
          title={
            <div>
              <Typography variant="subtitle2">Supported File Types</Typography>
              <Typography variant="body2">Images, Video, Audio, 3D Models, HTML, Text, Archives</Typography>
              <Typography variant="subtitle2">Target size ≤ 20 KB</Typography>
            </div>
          }
          arrow
        >
          <span>
            <Button
              variant="contained"
              component="span"
              color="primary"
              sx={{ mt: 1 }}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload Your NFT *'}
            </Button>
          </span>
        </Tooltip>
      </label>

      {fileName && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Selected:</strong> {fileName}
        </Typography>
      )}

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

export default MintUpload;
