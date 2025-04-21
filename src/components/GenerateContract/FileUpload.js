// src/components/GenerateContract/FileUpload.js
/* this app was developed by @jams2blues with love for the Tezos community */
import React, { useState, useRef } from 'react';
import { Button, Snackbar, Alert, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';

// Acceptable MIME types
const ACCEPTED_MIME_TYPES = [
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
  'model/gltf-binary',
  'model/gltf+json',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-pn-wav',
  'audio/vnd.wave',
  'audio/x-wav',
  'audio/flac',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
  'text/plain',
  'application/json'
].join(',');

// 15MB raw file size limit (to match your ghostnet code).
const RAW_MAX_SIZE = 15 * 1024 * 1024;

// 20KB recommended max (we only warn if exceeded).
const ENCODED_MAX_SIZE = 20000;

const FileUpload = ({ setArtifactData }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [localFileName, setLocalFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [artifactFile, setArtifactFile] = useState(null); // NEW: so we can preview
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset state each time
    setLocalFileName('');
    setArtifactData(null);
    setArtifactFile(null);

    // Check raw file size (15MB limit).
    if (file.size > RAW_MAX_SIZE) {
      setSnackbar({
        open: true,
        message: 'File size exceeds 15MB, things get hairy above this, try at your own risk.',
        severity: 'warning',
      });
      e.target.value = null;
      return;
    }

    // Check that the file MIME type is accepted
    const acceptedTypes = ACCEPTED_MIME_TYPES.split(',');
    if (!acceptedTypes.includes(file.type)) {
      setSnackbar({
        open: true,
        message: 'Unsupported file type.',
        severity: 'error',
      });
      e.target.value = null;
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result;

      // Calculate the byte size of the base64-encoded file
      const base64Data = dataUri.split(',')[1] || '';
      const padding = (base64Data.match(/=+$/) || [''])[0].length;
      const byteSize = Math.floor((base64Data.length * 3) / 4) - padding;

      // If the encoded file size > 20KB, only WARN (don’t block).
      if (byteSize > ENCODED_MAX_SIZE) {
        setSnackbar({
          open: true,
          message: 'Warning: Encoded file size exceeds 20KB. Consider compressing for better OBJKT support.',
          severity: 'warning',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'File uploaded successfully.',
          severity: 'success',
        });
      }

      setArtifactData(dataUri);
      setLocalFileName(file.name);
      setArtifactFile(file); // Store the raw File object
      setUploading(false);
    };

    reader.onerror = () => {
      setSnackbar({
        open: true,
        message: 'Error reading file. Please try again.',
        severity: 'error',
      });
      e.target.value = null;
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Provide a simple preview if the user selected an image
  const renderPreview = () => {
    if (artifactFile && artifactFile.type.startsWith('image/') && !uploading) {
      return (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <img
            src={URL.createObjectURL(artifactFile)}
            alt="Collection Thumbnail Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              borderRadius: '8px',
              objectFit: 'contain',
              backgroundColor: '#f5f5f5',
            }}
          />
        </Box>
      );
    }
    return null;
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        accept={ACCEPTED_MIME_TYPES}
        style={{ display: 'none' }}
        id="collection-thumbnail-upload"
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="collection-thumbnail-upload">
        <Button
          variant="contained"
          component="span"
          color="primary"
          sx={{ mt: 1 }}
          fullWidth={isSmallScreen}
          disabled={uploading}
          aria-label="Upload Collection Thumbnail"
        >
          {uploading ? 'Uploading...' : 'Upload Collection Thumbnail'}
        </Button>
      </label>

      {localFileName && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Selected file:</strong> {localFileName}
        </Typography>
      )}

      {renderPreview()}

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

export default FileUpload;
