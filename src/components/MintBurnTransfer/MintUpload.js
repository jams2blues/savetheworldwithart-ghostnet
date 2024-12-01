// frontend/src/components/MintBurnTransfer/MintUpload.js

import React, { useState } from 'react';
import { Button, Snackbar, Alert, Typography } from '@mui/material';

const MintUpload = ({ onFileChange, onFileDataUrlChange }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

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

      // Define size limits
      const RAW_MAX_SIZE = 20 * 1024; // 20KB in bytes

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
      const acceptedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
      if (!acceptedTypes.includes(file.type)) {
        setSnackbar({
          open: true,
          message: 'Unsupported file type. Please upload an image (PNG, JPEG, GIF, SVG).',
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

          // Verify that the encoded size does not exceed ~26.67KB
          if (byteSize > 27000) { // 26.67KB rounded up
            setSnackbar({
              open: true,
              message: 'Encoded file size exceeds 27KB. Please upload a smaller file.',
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

  return (
    <div>
      <input
        accept="image/png, image/jpeg, image/gif, image/svg+xml"
        style={{ display: 'none' }}
        id="mint-nft-upload"
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="mint-nft-upload">
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
