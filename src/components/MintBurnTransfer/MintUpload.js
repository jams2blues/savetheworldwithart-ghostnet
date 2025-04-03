// frontend/src/components/MintBurnTransfer/MintUpload.js (Ghostnet Version)

import React, { useState } from 'react';
import { Button, Snackbar, Alert, Typography, Tooltip } from '@mui/material';

const MintUpload = ({ onFileChange, onFileDataUrlChange }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Comprehensive list of accepted MIME types
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
    'audio/mpeg',           // MP3
    'audio/ogg',
    'audio/wav',
    'audio/wave',
    'audio/x-pn-wav',
    'audio/vnd.wave',
    'audio/x-wav',
    'audio/flac',
    'model/gltf-binary',    // GLB
    'model/gltf+json',      // GLTF
    'application/pdf',
    'text/plain',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'multipart/x-zip',
  ];

  // Function to calculate byte size
  const getByteSize = (dataUri) => {
    try {
      const base64Data = dataUri.split(',')[1];
      if (!base64Data) return 0;
      const padding = (base64Data.match(/=+$/) || [''])[0].length;
      return Math.floor((base64Data.length * 3) / 4) - padding;
    } catch (error) {
      console.error('Error calculating byte size:', error);
      return 0;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Reset previous state
      setFileName('');
      onFileChange(null);
      onFileDataUrlChange(null);

      // Define size limit
      const RAW_MAX_SIZE = 20 * 1024; // 20KB in bytes

      // Validate file size
      if (file.size > RAW_MAX_SIZE) { // 20KB raw limit
        setSnackbar({
          open: true,
          message: 'File size exceeds 20KB. Please upload a smaller file.',
          severity: 'error',
        });
        e.target.value = null; // Reset the input
        return;
      }

      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setSnackbar({
          open: true,
          message: 'Unsupported file type. Please upload a supported file.',
          severity: 'error',
        });
        e.target.value = null; // Reset the input
        return;
      }

      // Read the file as Data URL
      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUri = reader.result;
          const byteSize = getByteSize(dataUri);

          // Verify that the encoded size does not exceed 20KB
          if (byteSize > 20000) { // 20KB
            setSnackbar({
              open: true,
              message: 'Encoded file size exceeds 20KB. Please upload a smaller file.',
              severity: 'error',
            });
            e.target.value = null; // Reset the input
            setUploading(false);
            return;
          }

          // Pass the Data URL back to parent
          if (onFileDataUrlChange) {
            onFileDataUrlChange(dataUri);
          }
          // Notify parent component of the selected file
          if (onFileChange) {
            onFileChange(file);
          }
          // Update file name to display
          setFileName(file.name);
          setSnackbar({
            open: true,
            message: 'File uploaded successfully.',
            severity: 'success',
          });
        };
        reader.onerror = () => {
          setSnackbar({
            open: true,
            message: 'Error reading file. Please try again.',
            severity: 'error',
          });
          e.target.value = null; // Reset the input
        };
        reader.readAsDataURL(file);
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Unexpected error occurred. Please try again.',
          severity: 'error',
        });
        e.target.value = null; // Reset the input
      } finally {
        setUploading(false);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Tooltip content
  const tooltipTitle = (
    <div>
      <Typography variant="subtitle2">Supported File Types:</Typography>
      <Typography variant="body2">- Images: BMP, GIF, JPEG, PNG, APNG, SVG, WEBP</Typography>
      <Typography variant="body2">- Videos: MP4, OGG, QuickTime, WEBM</Typography>
      <Typography variant="body2">- Audio: MP3, OGG, WAV, WAVE, X-PN-WAV, VND.WAVE, X-WAV, FLAC</Typography>
      <Typography variant="body2">- 3D Models: GLB, GLTF</Typography>
      <Typography variant="body2">- Text: PDF, Plain Text, JSON</Typography>
      <Typography variant="body2">- Interactive: ZIP, X-ZIP-COMPACTED, Multipart/X-ZIP</Typography>
      <br />
      <Typography variant="subtitle2">Maximum File Size:</Typography>
      <Typography variant="body2">20KB</Typography>
    </div>
  );

  return (
    <div>
      <input
        accept={ACCEPTED_TYPES.join(', ')}
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
              style={{ marginTop: '10px' }}
              disabled={uploading}
              aria-label="Upload Your NFT File"
            >
              {uploading ? 'Uploading...' : 'Upload Your NFT *'}
            </Button>
          </span>
        </Tooltip>
      </label>
      {fileName && (
        <Typography variant="body2" style={{ marginTop: '10px' }}>
          <strong>Selected file:</strong> {fileName}
        </Typography>
      )}

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MintUpload;
