// src/components/FileUpload.js

import React, { useState } from 'react';
import { Button, Snackbar, Alert, Typography } from '@mui/material';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

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
  'application/json',
].join(',');

const RAW_MAX_SIZE = 15 * 1024 * 1024; // 15MB in bytes
const ENCODED_MAX_SIZE = 20000; // 20KB in bytes

const FileUpload = ({ setArtifactData }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // Detect small screens

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Reset previous state
      setFileName('');
      setArtifactData(null);

      // Validate file size
      if (file.size > RAW_MAX_SIZE) { // 15MB raw limit
        setSnackbar({
          open: true,
          message: 'File size exceeds 15MB. Please upload a smaller file.',
          severity: 'error',
        });
        e.target.value = null; // Reset the input
        return;
      }

      // Validate file type
      const acceptedTypes = ACCEPTED_MIME_TYPES.split(',');
      if (!acceptedTypes.includes(file.type)) {
        setSnackbar({
          open: true,
          message: 'Unsupported file type. Please upload a supported file format.',
          severity: 'error',
        });
        e.target.value = null; // Reset the input
        return;
      }

      // If the file is an image, validate aspect ratio
      if (file.type.startsWith('image/')) {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          const { width, height } = img;
          if (width !== height) {
            setSnackbar({
              open: true,
              message: 'Image must have a 1:1 aspect ratio.',
              severity: 'error',
            });
            e.target.value = null; // Reset the input
            URL.revokeObjectURL(objectUrl);
            return;
          }
          URL.revokeObjectURL(objectUrl);
          proceedFileUpload(file, e);
        };
        img.onerror = () => {
          setSnackbar({
            open: true,
            message: 'Error processing image. Please try a different file.',
            severity: 'error',
          });
          e.target.value = null; // Reset the input
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
      } else {
        // For non-image files, proceed without aspect ratio check
        proceedFileUpload(file, e);
      }
    }
  };

  const proceedFileUpload = (file, e) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result;

        // Verify that the encoded size does not exceed 20KB
        const byteString = atob(dataUri.split(',')[1]);
        const byteLength = byteString.length;
        if (byteLength > ENCODED_MAX_SIZE) { // 20KB limit
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
        if (setArtifactData) {
          setArtifactData(dataUri);
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
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div>
      <input
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
          style={{ marginTop: '10px' }}
          fullWidth={isSmallScreen} // Make button full width on small screens
          disabled={uploading}
          aria-label="Upload Collection Thumbnail"
        >
          {uploading ? 'Uploading...' : 'Upload Collection Thumbnail'}
        </Button>
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

export default FileUpload;
