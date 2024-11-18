// src/components/FileUpload.js

import React, { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';

const FileUpload = ({ setArtifactData }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Estimate the size after encoding. Data URI increases size by ~33%
      const estimatedSize = (file.size * 4) / 3;
      if (estimatedSize > 20000) { // 20KB limit
        setSnackbar({
          open: true,
          message: 'File size exceeds 20KB after encoding. Please upload a smaller file.',
          severity: 'error',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result;
        setArtifactData(dataUri); // Automatically handle MIME type
      };
      reader.readAsDataURL(file);
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
        <Button variant="contained" component="span" style={{ marginTop: '10px' }}>
          Upload Collection Thumbnail, Under 20KB! *
        </Button>
      </label>

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

export default FileUpload;
