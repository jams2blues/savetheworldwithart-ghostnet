// src/components/MintBurnTransfer/MintUpload.js
// Summary: MintUpload – A component that allows users to upload their NFT file for minting.
// It supports multiple file types, warns if the file size (raw or encoded) exceeds the recommended 20KB,
// and provides user feedback via snackbars. The file is accepted even if larger than 20KB.
/* this app was developed by @jams2blues with love for the Tezos community */
import React, { useState, useRef } from 'react';
import { Button, Snackbar, Alert, Typography, Tooltip } from '@mui/material';

const ACCEPTED_TYPES = [
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/apng',
  'image/svg+xml',
  'image/webp',
  'video/mp4',
  'video/ogg',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-pn-wav',
  'audio/vnd.wave',
  'audio/x-wav',
  'audio/flac',
  'model/gltf-binary',
  'model/gltf+json',
  'application/pdf',
  'text/plain',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip'
];

// Recommended maximum size for the raw file (20KB) for optimal performance (not blocking if exceeded)
const RAW_RECOMMENDED_SIZE = 20 * 1024;

const MintUpload = ({ onFileChange, onFileDataUrlChange }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Utility: Calculate the byte size of a base64 data URI
  const getByteSize = (dataUri) => {
    try {
      const base64Data = dataUri.split(',')[1] || '';
      const padding = (base64Data.match(/=+$/) || [''])[0].length;
      return Math.floor((base64Data.length * 3) / 4) - padding;
    } catch (error) {
      console.error('Error calculating byte size:', error);
      return 0;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset previous state
    setFileName('');
    onFileChange(null);
    onFileDataUrlChange(null);

    // Check that the file MIME type is accepted
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSnackbar({ open: true, message: 'Unsupported file type.', severity: 'error' });
      e.target.value = null;
      return;
    }

    // Warn if the raw file size exceeds the recommended limit (20KB)
    if (file.size > RAW_RECOMMENDED_SIZE) {
      setSnackbar({ open: true, message: 'Warning: File size exceeds 20KB recommended limit.', severity: 'warning' });
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result;
        const byteSize = getByteSize(dataUri);
        // Warn if the encoded file size exceeds the recommended limit
        if (byteSize > RAW_RECOMMENDED_SIZE) {
          setSnackbar({ open: true, message: 'Warning: Encoded file size exceeds recommended limit.', severity: 'warning' });
        }
        onFileDataUrlChange(dataUri);
        onFileChange(file);
        setFileName(file.name);
        setSnackbar({ open: true, message: 'File uploaded successfully.', severity: 'success' });
      };
      reader.onerror = () => {
        setSnackbar({ open: true, message: 'Error reading file.', severity: 'error' });
        e.target.value = null;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unexpected error occurred.', severity: 'error' });
      e.target.value = null;
    } finally {
      setUploading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Tooltip with supported file types and recommended size
  const tooltipTitle = (
    <div>
      <Typography variant="subtitle2">Supported File Types:</Typography>
      <Typography variant="body2">Images, Videos, Audio, 3D Models, Text, Archives</Typography>
      <Typography variant="subtitle2">Recommended Max Size:</Typography>
      <Typography variant="body2">20KB</Typography>
    </div>
  );

  return (
    <div>
      <input
        ref={fileInputRef}
        accept={ACCEPTED_TYPES.join(',')}
        style={{ display: 'none' }}
        id="mint-nft-upload"
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="mint-nft-upload">
        <Tooltip title={tooltipTitle} arrow>
          <span>
            <Button
              variant="contained"
              component="span"
              color="primary"
              sx={{ mt: 1 }}
              disabled={uploading}
              aria-label="Upload Your NFT File"
            >
              {uploading ? 'Uploading...' : 'Upload Your NFT *'}
            </Button>
          </span>
        </Tooltip>
      </label>
      {fileName && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Selected file:</strong> {fileName}
        </Typography>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MintUpload;
