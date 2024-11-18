// src/components/MintBurnTransfer/MintUpload.js

import React, { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';

const MintUpload = ({ onFileChange, onFileDataUrlChange }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (less than 20KB)
      if (file.size > 20 * 1024) { // 20KB limit
        setSnackbar({
          open: true,
          message: 'File size exceeds 20KB. Please upload a smaller file.',
          severity: 'error',
        });
        return;
      }

      // Check file type
      const acceptedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
      if (!acceptedTypes.includes(file.type)) {
        setSnackbar({
          open: true,
          message: 'Unsupported file type. Please upload an image (PNG, JPEG, GIF, SVG).',
          severity: 'error',
        });
        return;
      }

      // Read the file as Data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        // Pass the Data URL back to parent
        if (onFileDataUrlChange) {
          onFileDataUrlChange(dataUrl);
        }
      };
      reader.readAsDataURL(file);

      // Notify parent component of the selected file
      if (onFileChange) {
        onFileChange(file);
      }

      // Update file name to display
      setFileName(file.name);
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
        <Button variant="contained" component="span" style={{ marginTop: '10px' }}>
          Upload Your NFT *
        </Button>
      </label>
      {fileName && (
        <div style={{ marginTop: '10px' }}>
          <strong>Selected file:</strong> {fileName}
        </div>
      )}

      {/* Snackbar for Notifications */}
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
