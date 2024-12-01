// src/components/FileUpload.js

import React, { useState } from 'react';
import { Button, Snackbar, Alert, Typography } from '@mui/material';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

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

      // Define size limits
      const RAW_MAX_SIZE = 15 * 1024; // 15KB in bytes

      if (file.size > RAW_MAX_SIZE) { // 15KB raw limit
        setSnackbar({
          open: true,
          message: 'File size exceeds 15KB. Please upload a smaller file to stay under 20KB after encoding.',
          severity: 'error',
        });
        e.target.value = null; // Reset the input
        return;
      }

      // Validate file type
      const acceptedTypes = [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/svg+xml',
        'video/mp4',
        'video/mpeg',
        'text/html',
      ];
      if (!acceptedTypes.includes(file.type)) {
        setSnackbar({
          open: true,
          message: 'Unsupported file type. Please upload an image, video, or HTML file.',
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

          // Verify that the encoded size does not exceed ~20KB
          // Base64 increases size by ~33%, but dataUri includes prefix (e.g., data:image/png;base64,)
          // We'll check the byte length after decoding
          const byteString = atob(dataUri.split(',')[1]);
          const byteLength = byteString.length;
          if (byteLength > 20000) { // 20KB limit
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
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div>
      <input
        accept="image/*,video/*,text/html"
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
          {uploading ? 'Uploading...' : 'Upload Collection Thumbnail, Under 15KB *'}
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
