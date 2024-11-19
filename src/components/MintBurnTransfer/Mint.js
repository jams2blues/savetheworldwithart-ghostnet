// frontend/src/components/MintBurnTransfer/Mint.js

import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
  FormControlLabel,
  Checkbox,
  Link,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
} from '@mui/material';
import { MichelsonMap } from '@taquito/taquito';
import MintUpload from './MintUpload';
import { Buffer } from 'buffer';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { WalletContext } from '../../contexts/WalletContext';

// Styled Components
const Section = styled.div`
  margin-top: 20px;
`;

// Constants for attribute limits and editions cap
const MAX_ATTRIBUTES = 10;
const MAX_ATTRIBUTE_NAME_LENGTH = 32;
const MAX_ATTRIBUTE_VALUE_LENGTH = 32;
const MAX_EDITIONS = 10000; // Maximum editions cap

// Helper function to convert string to hex
const stringToHex = (str) => Buffer.from(str, 'utf8').toString('hex');

const Mint = ({ contractAddress, tezos, setSnackbar, contractVersion }) => {

  // State variables for form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    creators: '',
    tags: '',
    toAddress: '',
    royalties: '',
    license: '',
    customLicense: '',
    amount: '1', // Only for v2
  });

  // State variables for attributes
  const [attributes, setAttributes] = useState([{ name: '', value: '' }]);

  // State variables for artifact upload
  const [artifactFile, setArtifactFile] = useState(null);
  const [artifactDataUrl, setArtifactDataUrl] = useState(null);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Agreement state
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    // If the field is 'amount', enforce the maximum and minimum limits
    if (name === 'amount') {
      const numericValue = parseInt(value, 10);
      if (numericValue > MAX_EDITIONS) {
        newValue = MAX_EDITIONS.toString();
        setSnackbar({
          open: true,
          message: `Maximum of ${MAX_EDITIONS} editions allowed.`,
          severity: 'warning',
        });
      }
      // Ensure no negative or zero values
      if (numericValue < 1) {
        newValue = '1';
        setSnackbar({
          open: true,
          message: `Minimum of 1 edition required.`,
          severity: 'warning',
        });
      }
    }

    setFormData({ ...formData, [name]: newValue });
  };

  // Handle attribute changes
  const handleAttributeChange = (index, field, value) => {
    // Enforce character limits
    if (
      (field === 'name' && value.length > MAX_ATTRIBUTE_NAME_LENGTH) ||
      (field === 'value' && value.length > MAX_ATTRIBUTE_VALUE_LENGTH)
    ) {
      setSnackbar({
        open: true,
        message: `Attribute ${field} cannot exceed ${
          field === 'name' ? MAX_ATTRIBUTE_NAME_LENGTH : MAX_ATTRIBUTE_VALUE_LENGTH
        } characters.`,
        severity: 'warning',
      });
      return;
    }

    const newAttributes = [...attributes];
    newAttributes[index][field] = value;

    // Check for duplicate attribute names
    if (field === 'name') {
      const attributeNames = newAttributes.map((attr) => attr.name.trim().toLowerCase());
      const nameOccurrences = attributeNames.reduce((acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      if (
        newAttributes[index].name &&
        nameOccurrences[newAttributes[index].name.trim().toLowerCase()] > 1
      ) {
        setSnackbar({
          open: true,
          message: `Attribute name "${newAttributes[index].name}" is already in use. Please use unique names.`,
          severity: 'warning',
        });
        return;
      }
    }

    setAttributes(newAttributes);
  };

  // Add a new attribute
  const addAttribute = () => {
    if (attributes.length >= MAX_ATTRIBUTES) {
      setSnackbar({
        open: true,
        message: `You can add up to ${MAX_ATTRIBUTES} attributes only.`,
        severity: 'warning',
      });
      return;
    }
    setAttributes([...attributes, { name: '', value: '' }]);
  };

  // Remove an attribute
  const removeAttribute = (index) => {
    const newAttributes = attributes.filter((_, i) => i !== index);
    setAttributes(newAttributes);
  };

  // Handle file upload
  const handleFileChange = (file) => {
    setArtifactFile(file);
  };

  const handleFileDataUrlChange = (dataUrl) => {
    setArtifactDataUrl(dataUrl);
  };

  // Handle agreement checkbox
  const handleAgreementChange = (e) => {
    setAgreedToTerms(e.target.checked);
  };

  // Function to fetch current minted editions for v2
  const getCurrentMintedEditions = async () => {
    try {
      const contract = await tezos.wallet.at(contractAddress);
      const storage = await contract.storage();

      if (contractVersion === 'v1') {
        // For v1, each contract handles a single edition
        return 1;
      } else if (contractVersion === 'v2') {
        // For v2, fetch 'next_token_id' from storage
        // Assuming 'next_token_id' starts at 1 and increments by 1 for each mint
        const nextTokenId = storage.next_token_id.toNumber();
        const currentMinted = nextTokenId - 1; // Adjusting for 1-based indexing
        return currentMinted;
      } else {
        throw new Error('Unsupported contract version.');
      }
    } catch (error) {
      throw new Error('Failed to fetch contract storage.');
    }
  };

  // Handle minting
  const handleMint = async () => {
    const {
      name,
      description,
      creators,
      tags,
      toAddress,
      royalties,
      license,
      customLicense,
      amount,
    } = formData;

    // Field-specific validation with detailed messages
    if (!name.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter the NFT Name.',
        severity: 'warning',
      });
      return;
    }

    if (!description.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter the NFT Description.',
        severity: 'warning',
      });
      return;
    }

    if (!artifactFile || !artifactDataUrl) {
      setSnackbar({
        open: true,
        message: 'Please upload an Artifact File and ensure it is processed.',
        severity: 'warning',
      });
      return;
    }

    if (!creators.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter the Creator Address.',
        severity: 'warning',
      });
      return;
    }

    if (!toAddress.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter the Recipient Address.',
        severity: 'warning',
      });
      return;
    }

    // Validate royalties (must be a number between 0 and 10)
    const royaltiesValue = parseFloat(royalties);
    if (isNaN(royaltiesValue)) {
      setSnackbar({
        open: true,
        message: 'Royalties must be a valid number.',
        severity: 'warning',
      });
      return;
    }

    if (royaltiesValue < 0 || royaltiesValue > 10) {
      setSnackbar({
        open: true,
        message: 'Royalties must be between 0 and 10%.',
        severity: 'warning',
      });
      return;
    }

    // Validate license
    if (!license) {
      setSnackbar({
        open: true,
        message: 'Please select a License.',
        severity: 'warning',
      });
      return;
    }

    if (license === 'Custom' && !customLicense.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter your Custom License text.',
        severity: 'warning',
      });
      return;
    }

    // Validate attributes
    const attributeNamesSet = new Set();
    for (let attr of attributes) {
      if (attr.name.length > MAX_ATTRIBUTE_NAME_LENGTH) {
        setSnackbar({
          open: true,
          message: `Attribute name cannot exceed ${MAX_ATTRIBUTE_NAME_LENGTH} characters.`,
          severity: 'warning',
        });
        return;
      }
      if (attr.value.length > MAX_ATTRIBUTE_VALUE_LENGTH) {
        setSnackbar({
          open: true,
          message: `Attribute value cannot exceed ${MAX_ATTRIBUTE_VALUE_LENGTH} characters.`,
          severity: 'warning',
        });
        return;
      }
      const attrNameLower = attr.name.trim().toLowerCase();
      if (attrNameLower && attributeNamesSet.has(attrNameLower)) {
        setSnackbar({
          open: true,
          message: `Duplicate attribute name "${attr.name}" detected. Please use unique names.`,
          severity: 'warning',
        });
        return;
      }
      if (attrNameLower) {
        attributeNamesSet.add(attrNameLower);
      }
    }

    // Validate amount for v2
    if (contractVersion === 'v2') {
      const amountValue = parseInt(amount, 10);
      if (isNaN(amountValue) || amountValue <= 0) {
        setSnackbar({
          open: true,
          message: 'Amount must be a positive integer.',
          severity: 'warning',
        });
        return;
      }
    }

    try {
      setLoading(true);

      // For v2, enforce the 10,000 editions cap
      if (contractVersion === 'v2') {
        const currentMintedEditions = await getCurrentMintedEditions();
        const mintAmount = parseInt(amount, 10);
        const totalAfterMint = currentMintedEditions + mintAmount;

        if (totalAfterMint > MAX_EDITIONS) {
          setSnackbar({
            open: true,
            message: `Minting ${mintAmount} editions would exceed the maximum limit of ${MAX_EDITIONS} editions.`,
            severity: 'error',
          });
          setLoading(false);
          return;
        }
      }

      // Prepare metadata map
      const metadataMap = new MichelsonMap();

      // Required fields
      metadataMap.set('name', stringToHex(name));
      metadataMap.set('description', stringToHex(description));
      metadataMap.set('artifactUri', stringToHex(artifactDataUrl));
      metadataMap.set(
        'creators',
        stringToHex(JSON.stringify(creators.split(',').map((c) => c.trim())))
      );

      // Additional fields
      if (license) {
        const rightsValue = license === 'Custom' ? customLicense : license;
        if (rightsValue) {
          metadataMap.set('rights', stringToHex(rightsValue));
        }
      }
      metadataMap.set('decimals', stringToHex('0')); // NFTs typically have 0 decimals
      if (artifactFile.type) {
        metadataMap.set('mimeType', stringToHex(artifactFile.type));
      }
      metadataMap.set(
        'royalties',
        stringToHex(JSON.stringify({ decimals: 2, shares: { [toAddress]: Math.round(royaltiesValue * 100) } }))
      );

      // Handle attributes
      const filteredAttributes = attributes.filter((attr) => attr.name && attr.value);
      if (filteredAttributes.length > 0) {
        metadataMap.set('attributes', stringToHex(JSON.stringify(filteredAttributes)));
      }

      if (tags) {
        metadataMap.set(
          'tags',
          stringToHex(JSON.stringify(tags.split(',').map((t) => t.trim())))
        );
      }

      // Removed 'mimeType' as it's unused to fix ESLint warning

      const contract = await tezos.wallet.at(contractAddress);

      let op;
      if (contractVersion === 'v1') {
        // v1 Mint: mint(metadata_map, to_address)
        op = await contract.methods.mint(metadataMap, toAddress).send();
      } else if (contractVersion === 'v2') {
        // v2 Mint: mint(amount, metadata_map, to_address)
        const amountValue = parseInt(amount, 10);
        op = await contract.methods.mint(amountValue, metadataMap, toAddress).send();
      }

      setSnackbar({
        open: true,
        message: 'Minting in progress...',
        severity: 'info',
      });

      await op.confirmation();

      setSnackbar({
        open: true,
        message: 'NFT minted successfully.',
        severity: 'success',
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        creators: '',
        tags: '',
        toAddress: '',
        royalties: '',
        license: '',
        customLicense: '',
        amount: '1',
      });
      setAttributes([{ name: '', value: '' }]);
      setArtifactFile(null);
      setArtifactDataUrl(null);
      setAgreedToTerms(false);
    } catch (error) {
      // Removed console.error for production
      setSnackbar({
        open: true,
        message: `Minting failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect to verify if artifactDataUrl is set correctly
  useEffect(() => {
    if (artifactFile && !artifactDataUrl) {
      // Possibly, trigger processing here if not handled by MintUpload
      // Ensure that MintUpload calls handleFileDataUrlChange correctly
    }
  }, [artifactFile, artifactDataUrl]);

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">
        Mint NFT Fully On-Chain ({contractVersion === 'v1' ? 'Single Edition' : 'Multiple Editions'})
      </Typography>
      <Typography variant="body2" gutterBottom>
        Enter the metadata for your NFT. Fields marked with an asterisk (*) are required.
      </Typography>
      <Grid container spacing={2}>
        {/* Name */}
        <Grid item xs={12}>
          <TextField
            label="Name *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            placeholder="NFT Name"
          />
        </Grid>
        {/* Description */}
        <Grid item xs={12}>
          <TextField
            label="Description *"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={4}
            placeholder="NFT Description"
          />
        </Grid>
        {/* Artifact Upload */}
        <Grid item xs={12}>
          <Typography variant="body1">Artifact File, keep under 20KB *</Typography>
          <MintUpload
            onFileChange={handleFileChange}
            onFileDataUrlChange={handleFileDataUrlChange}
          />
        </Grid>
        {/* Preview Image */}
        {artifactDataUrl && (
          <Grid item xs={12}>
            <Typography variant="body1">Preview:</Typography>
            <img
              src={artifactDataUrl}
              alt="NFT Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                marginTop: '10px',
              }}
            />
          </Grid>
        )}
        {/* Creators */}
        <Grid item xs={12}>
          <TextField
            label="Creator Address *"
            name="creators"
            value={formData.creators}
            onChange={handleInputChange}
            fullWidth
            placeholder="Your Tezos address (e.g., tz1...)"
          />
        </Grid>
        {/* Royalties */}
        <Grid item xs={12}>
          <TextField
            label="Royalties (%) * (Maximum 10%)"
            name="royalties"
            value={formData.royalties}
            onChange={handleInputChange}
            fullWidth
            placeholder="e.g., 10"
            type="number"
            InputProps={{ inputProps: { min: 0, max: 10, step: 0.01 } }}
          />
        </Grid>
        {/* License */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="license-label">License</InputLabel>
            <Select
              labelId="license-label"
              name="license"
              value={formData.license}
              onChange={handleInputChange}
              label="License"
            >
              <MenuItem value="">Select a License</MenuItem>
              <MenuItem value="CC0 (Public Domain)">CC0 (Public Domain)</MenuItem>
              <MenuItem value="All Rights Reserved">All Rights Reserved</MenuItem>
              <MenuItem value="CC BY 4.0">CC BY 4.0</MenuItem>
              <MenuItem value="CC BY-SA 4.0">CC BY-SA 4.0</MenuItem>
              <MenuItem value="CC BY-ND 4.0">CC BY-ND 4.0</MenuItem>
              <MenuItem value="CC BY-NC 4.0">CC BY-NC 4.0</MenuItem>
              <MenuItem value="CC BY-NC-SA 4.0">CC BY-NC-SA 4.0</MenuItem>
              <MenuItem value="CC BY-NC-ND 4.0">CC BY-NC-ND 4.0</MenuItem>
              <MenuItem value="MIT">MIT</MenuItem>
              <MenuItem value="GPL">GPL</MenuItem>
              <MenuItem value="Apache 2.0">Apache 2.0</MenuItem>
              <MenuItem value="Unlicense">Unlicense</MenuItem>
              <MenuItem value="Custom">Custom</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {/* Custom License */}
        {formData.license === 'Custom' && (
          <Grid item xs={12}>
            <TextField
              label="Custom License *"
              name="customLicense"
              value={formData.customLicense}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={2}
              placeholder="Enter your custom license text"
            />
          </Grid>
        )}
        {/* Attributes */}
        <Grid item xs={12}>
          <Typography variant="body1">Attributes</Typography>
          {attributes.map((attribute, index) => (
            <Grid container spacing={1} key={index} alignItems="center">
              <Grid item xs={5}>
                <TextField
                  label="Name"
                  value={attribute.name}
                  onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  label="Value"
                  value={attribute.value}
                  onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                {index === 0 ? (
                  <IconButton onClick={addAttribute} color="primary">
                    <AddCircleIcon />
                  </IconButton>
                ) : (
                  <IconButton onClick={() => removeAttribute(index)} color="secondary">
                    <RemoveCircleIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}
        </Grid>
        {/* Tags */}
        <Grid item xs={12}>
          <TextField
            label="Tags"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            fullWidth
            placeholder="Comma-separated tags"
          />
        </Grid>
        {/* Recipient Address */}
        <Grid item xs={12}>
          <TextField
            label="Recipient Address *"
            name="toAddress"
            value={formData.toAddress}
            onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
            fullWidth
            placeholder="Address to receive the NFT (e.g., tz1...)"
          />
        </Grid>
        {/* Amount (Only for v2) */}
        {contractVersion === 'v2' && (
          <Grid item xs={12}>
            <TextField
              label="Amount *"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              fullWidth
              placeholder="Number of editions to mint (Max 10,000 total)"
              type="number"
              InputProps={{ inputProps: { min: 1, max: MAX_EDITIONS, step: 1 } }}
            />
          </Grid>
        )}
        {/* Agree to Terms */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={agreedToTerms}
                onChange={handleAgreementChange}
                color="primary"
              />
            }
            label={
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer">
                  terms and conditions
                </Link>
                .
              </span>
            }
          />
        </Grid>
      </Grid>
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleMint}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Minting...' : 'Mint NFT'}
        </Button>
      </div>
      {/* Add the desired text after the Mint button */}
      <Section>
        <Typography variant="body2" style={{ marginTop: '10px', textAlign: 'right' }}>
          After minting, check OBJKT! ✌️🤟🤘
        </Typography>
      </Section>
      {/* Step 2: Display Contract Address */}
      {contractAddress && (
        <Section>
          <Typography variant="h6" gutterBottom>
            Step 2: Your Contract is Deployed
          </Typography>
          <Typography variant="body2" gutterBottom>
            Your contract has been successfully deployed. Below is your contract address. You can use this address to mint NFTs.
          </Typography>
          <Typography
            variant="body1"
            style={{
              wordBreak: 'break-all',
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
            }}
          >
            {contractAddress}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigator.clipboard.writeText(contractAddress)}
            style={{ marginTop: '10px' }}
          >
            Copy Contract Address
          </Button>
          <Typography variant="body2" style={{ marginTop: '10px' }}>
            Please check your contract on{' '}
            <Link
              href={`https://better-call.dev/ghostnet/${contractAddress}/operations`}
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              underline="hover"
            >
              Better Call Dev
            </Link>{' '}
            or{' '}
            <Link
              href={`https://ghostnet.objkt.com/collections/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              underline="hover"
            >
              OBJKT.com
            </Link>{' '}
            to verify your contract.
          </Typography>
        </Section>
      )}
    </div>
  );
};

export default Mint;
