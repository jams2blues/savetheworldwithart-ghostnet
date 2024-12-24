// frontend/src/components/MintBurnTransfer/Mint.js

import React, { useState, useEffect, useRef } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Chip,
  Box,
} from '@mui/material';
import { MichelsonMap } from '@taquito/taquito';
import MintUpload from './MintUpload';
import { Buffer } from 'buffer';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import InfoIcon from '@mui/icons-material/Info';
import { BigNumber } from 'bignumber.js';

// Styled Components
const Section = styled.div`
  margin-top: 20px;
`;

// Constants for attribute limits and editions cap
const MAX_ATTRIBUTES = 10;
const MAX_ATTRIBUTE_NAME_LENGTH = 32;
const MAX_ATTRIBUTE_VALUE_LENGTH = 32;
const MAX_EDITIONS = 10000; // Maximum editions cap

// New Constants for Tag Validation
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 20;
const TAG_REGEX = /^[a-zA-Z0-9-_]+$/; // Allowed characters: alphanumeric, hyphens, underscores

// New Constant for Royalty Limit
const MAX_ROYALTIES = 25; // Maximum royalties cap

// Helper function to convert string to hex
const stringToHex = (str) => Buffer.from(str, 'utf8').toString('hex');

// Helper function to validate Tezos address
const isValidTezosAddress = (address) => {
  const tezosAddressRegex = /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/;
  return tezosAddressRegex.test(address);
};

// Helper function to recursively find a field in storage
const findFieldInStorage = (storage, fieldName) => {
  if (storage[fieldName] !== undefined) {
    return storage[fieldName];
  }
  for (const key in storage) {
    if (typeof storage[key] === 'object' && storage[key] !== null) {
      const result = findFieldInStorage(storage[key], fieldName);
      if (result !== undefined) {
        return result;
      }
    }
  }
  return undefined;
};

const Mint = ({ contractAddress, tezos, contractVersion, setSnackbar }) => {
  // State variables for form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    creators: '',
    toAddress: '',
    royalties: '',
    license: '',
    customLicense: '',
    amount: '1', // Only for v2
    nsfw: 'Does not contain NSFW', // New field
    flashingHazard: 'Does not contain Flashing Hazard', // New field
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

  // State for estimation results
  const [estimation, setEstimation] = useState({
    estimatedFeeTez: null,
    estimatedGasLimit: null,
    estimatedStorageLimit: null,
    estimatedStorageCostTez: null,
    totalEstimatedCostTez: null, // Added for total cost
  });

  // Confirmation Dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    estimatedFeeTez: null,
    estimatedStorageCostTez: null,
    estimatedGasLimit: null,
    estimatedStorageLimit: null,
    totalEstimatedCostTez: null,
  });

  // State for tags
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef(null);

  // Handle input changes for form fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

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

    setAttributes((prevAttributes) => {
      const newAttributes = [...prevAttributes];
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
            message: `Duplicate attribute name "${newAttributes[index].name}" detected. Please use unique names.`,
            severity: 'warning',
          });
          // Optionally, revert the change
          newAttributes[index][field] = '';
        }
      }

      return newAttributes;
    });
  };

  // Add a new attribute
  const addAttribute = () => {
    setAttributes((prevAttributes) => {
      if (prevAttributes.length >= MAX_ATTRIBUTES) {
        setSnackbar({
          open: true,
          message: `You can add up to ${MAX_ATTRIBUTES} attributes only.`,
          severity: 'warning',
        });
        return prevAttributes;
      }
      return [...prevAttributes, { name: '', value: '' }];
    });
  };

  // Remove an attribute
  const removeAttribute = (index) => {
    setAttributes((prevAttributes) => prevAttributes.filter((_, i) => i !== index));
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

  // Handle tag input changes
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  // Function to add a single tag
  const addTag = (tag) => {
    const trimmedTag = tag.trim().toLowerCase();

    // Validate tag format
    if (!TAG_REGEX.test(trimmedTag)) {
      setSnackbar({
        open: true,
        message: `Invalid tag "${tag}". Only alphanumeric characters, hyphens (-), and underscores (_) are allowed.`,
        severity: 'error',
      });
      return false;
    }

    // Check tag length
    if (trimmedTag.length > MAX_TAG_LENGTH) {
      setSnackbar({
        open: true,
        message: `Tag "${trimmedTag}" exceeds maximum length of ${MAX_TAG_LENGTH} characters.`,
        severity: 'error',
      });
      return false;
    }

    // Check for duplicates
    if (tags.includes(trimmedTag)) {
      setSnackbar({
        open: true,
        message: `Tag "${trimmedTag}" is already added.`,
        severity: 'warning',
      });
      return false;
    }

    // Check for maximum number of tags
    if (tags.length >= MAX_TAGS) {
      setSnackbar({
        open: true,
        message: `You can add up to ${MAX_TAGS} tags only.`,
        severity: 'warning',
      });
      return false;
    }

    // Add tag to the list using functional update
    setTags((prevTags) => [...prevTags, trimmedTag]);
    return true;
  };

  // Function to add multiple tags
  const addTags = (newTags) => {
    let addedCount = 0;
    let skippedCount = 0;

    newTags.forEach((tag) => {
      if (addedCount >= MAX_TAGS) {
        skippedCount += 1;
        return;
      }
      const success = addTag(tag);
      if (success) {
        addedCount += 1;
      } else {
        skippedCount += 1;
      }
    });

    if (skippedCount > 0) {
      setSnackbar({
        open: true,
        message: `Only ${addedCount} tags were added. ${skippedCount} tags were skipped due to validation rules or exceeding the maximum limit.`,
        severity: 'warning',
      });
    }
  };

  // Handle tag input key presses
  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput) {
        const newTags = tagInput.split(',').map((t) => t.trim()).filter((t) => t !== '');
        addTags(newTags);
        setTagInput('');
      }
    }
  };

  // Handle tag paste
  const handleTagPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const newTags = pasteData.split(',').map((t) => t.trim()).filter((t) => t !== '');
    addTags(newTags);
    setTagInput('');
  };

  // Remove a tag
  const removeTag = (tagToRemove) => {
    setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
  };

  // Function to fetch current minted editions for v2
  const getCurrentMintedEditions = async () => {
    try {
      const contract = await tezos.wallet.at(contractAddress);
      const storage = await contract.storage();
      console.log('Contract Storage:', storage);

      if (contractVersion === 'v1') {
        // For v1, each contract handles a single edition
        return 1;
      } else if (contractVersion === 'v2') {
        // For v2, fetch 'next_token_id' from storage using the helper
        const nextTokenId = findFieldInStorage(storage, 'next_token_id');
        if (nextTokenId) {
          const nextTokenIdNumber = nextTokenId.toNumber();
          const currentMinted = nextTokenIdNumber - 1; // Adjusting for 1-based indexing
          return currentMinted;
        } else {
          throw new Error('next_token_id not found in storage.');
        }
      } else {
        throw new Error('Unsupported contract version.');
      }
    } catch (error) {
      console.error('getCurrentMintedEditions Error:', error);
      throw new Error('Failed to fetch contract storage.');
    }
  };

  /**
   * Helper Function: Prepare Metadata Map
   * Constructs and returns a MichelsonMap with all necessary NFT metadata fields.
   */
  const prepareMetadataMap = () => {
    const {
      name,
      description,
      creators,
      toAddress,
      royalties,
      license,
      customLicense,
      nsfw,
      flashingHazard,
    } = formData;

    const metadataMap = new MichelsonMap();

    // Required fields
    metadataMap.set('name', '0x' + stringToHex(name));
    metadataMap.set('description', '0x' + stringToHex(description));
    metadataMap.set('artifactUri', '0x' + stringToHex(artifactDataUrl));
    metadataMap.set(
      'creators',
      '0x' + stringToHex(JSON.stringify(creators.split(',').map((c) => c.trim())))
    );

    // Additional fields
    if (license) {
      const rightsValue = license === 'Custom' ? customLicense : license;
      if (rightsValue) {
        metadataMap.set('rights', '0x' + stringToHex(rightsValue));
      }
    }
    metadataMap.set('decimals', '0x' + stringToHex('0')); // NFTs typically have 0 decimals
    if (artifactFile.type) {
      metadataMap.set('mimeType', '0x' + stringToHex(artifactFile.type));
    }

    // Royalties: decimals set to 4
    metadataMap.set(
      'royalties',
      '0x' +
        stringToHex(
          JSON.stringify({
            decimals: 4,
            shares: { [toAddress]: Math.round(royalties * 100) }, // e.g., 10% -> 1000
          })
        )
    );

    // Handle attributes
    const filteredAttributes = attributes.filter((attr) => attr.name && attr.value);
    if (filteredAttributes.length > 0) {
      metadataMap.set('attributes', '0x' + stringToHex(JSON.stringify(filteredAttributes)));
    }

    // Handle tags
    if (tags.length > 0) {
      metadataMap.set('tags', '0x' + stringToHex(JSON.stringify(tags)));
    }

    // Handle NSFW
    if (nsfw === 'Does contain NSFW') {
      metadataMap.set('contentRating', '0x' + stringToHex('mature'));
    }

    // Handle Flashing Hazards
    if (flashingHazard === 'Does contain Flashing Hazard') {
      // Construct your hazards object
      const accessibilityObj = { hazards: ["flashing"] };
    
      // Serialize to JSON and hex-encode
      const accessibilityJson = JSON.stringify(accessibilityObj);
      const accessibilityHex = "0x" + stringToHex(accessibilityJson);
    
      // Store as a top-level metadata field named "accessibility"
      metadataMap.set("accessibility", accessibilityHex);
    } 

    return metadataMap;
  };

  // Function to estimate minting fees
  const estimateMintFees = async () => {
    // Preliminary checks before estimation
    if (!artifactFile || !artifactDataUrl || !formData.toAddress.trim()) {
      // Necessary fields are missing; cannot estimate
      return null;
    }

    try {
      // Prepare metadata map using the helper function
      const metadataMap = prepareMetadataMap();

      console.log('Metadata Map for Estimation:', metadataMap);
      const contract = await tezos.wallet.at(contractAddress);
      console.log('Contract for Estimation:', contract);

      // Prepare mint operation
      let mintOperation;
      if (contractVersion === 'v2') {
        mintOperation = contract.methods.mint(parseInt(formData.amount, 10), metadataMap, formData.toAddress);
      } else {
        mintOperation = contract.methods.mint(metadataMap, formData.toAddress);
      }

      console.log('Mint Operation for Estimation:', mintOperation);

      // Convert the mint operation to transfer parameters
      const mintParams = await mintOperation.toTransferParams();
      console.log('Mint Parameters for Estimation:', mintParams);

      // Estimate minting operation fees using Tezos.estimate.transfer
      let mintEstimation;
      try {
        mintEstimation = await tezos.estimate.transfer(mintParams);
        console.log('Mint Estimation:', mintEstimation);
      } catch (estimationError) {
        console.error('Estimation Error:', estimationError);
        setSnackbar({
          open: true,
          message: `Failed to estimate minting fees: ${estimationError.message}`,
          severity: 'error',
        });
        return null;
      }

      const estimatedFeeMutez = mintEstimation.suggestedFeeMutez;
      const estimatedGasLimit = mintEstimation.gasLimit;
      const estimatedStorageLimit = mintEstimation.storageLimit;

      const estimatedFeeTez = new BigNumber(estimatedFeeMutez).dividedBy(1e6).toFixed(6);
      const estimatedStorageCostTez = new BigNumber(estimatedStorageLimit)
        .multipliedBy(0.00025)
        .toFixed(6); // 0.00025 ꜩ per storage unit

      console.log(`Estimated Fee: ${estimatedFeeTez} ꜩ`);
      console.log(`Estimated Gas Limit: ${estimatedGasLimit}`);
      console.log(`Estimated Storage Limit: ${estimatedStorageLimit}`);
      console.log(`Estimated Storage Cost: ${estimatedStorageCostTez} ꜩ`);

      // Calculate total estimated cost
      const totalEstimatedCostTez = new BigNumber(estimatedFeeTez)
        .plus(estimatedStorageCostTez)
        .toFixed(6);

      // Update estimation state
      setEstimation({
        estimatedFeeTez,
        estimatedGasLimit,
        estimatedStorageLimit,
        estimatedStorageCostTez,
        totalEstimatedCostTez,
      });

      // Return the estimation object
      return {
        estimatedFeeTez,
        estimatedStorageCostTez,
        estimatedGasLimit,
        estimatedStorageLimit,
        totalEstimatedCostTez,
      };
    } catch (error) {
      console.error('estimateMintFees Error:', error);
      setSnackbar({
        open: true,
        message: 'Failed to estimate minting fees.',
        severity: 'error',
      });
      return null;
    }
  };

  // Function to handle fee estimation and open confirmation dialog
  const handleMintButtonClick = async () => {
    // Perform all validations
    if (!formData.name.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter the NFT Name.',
        severity: 'warning',
      });
      return;
    }

    if (!formData.description.trim()) {
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

    if (!formData.creators.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter the Creator Address.',
        severity: 'warning',
      });
      return;
    }

    if (!formData.toAddress.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter the Recipient Address.',
        severity: 'warning',
      });
      return;
    }

    if (!isValidTezosAddress(formData.toAddress.trim())) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid Tezos Recipient Address.',
        severity: 'warning',
      });
      return;
    }

    const royaltiesValue = parseFloat(formData.royalties);
    if (isNaN(royaltiesValue)) {
      setSnackbar({
        open: true,
        message: 'Royalties must be a valid number.',
        severity: 'warning',
      });
      return;
    }

    // Updated Royalty Validation
    if (royaltiesValue < 0 || royaltiesValue > MAX_ROYALTIES) {
      setSnackbar({
        open: true,
        message: `Royalties must be between 0 and ${MAX_ROYALTIES}%.`,
        severity: 'warning',
      });
      return;
    }

    if (!formData.license) {
      setSnackbar({
        open: true,
        message: 'Please select a License.',
        severity: 'warning',
      });
      return;
    }

    if (formData.license === 'Custom' && !formData.customLicense.trim()) {
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

    // Validate tags
    if (tags.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add at least one tag.',
        severity: 'warning',
      });
      return;
    }

    // Validate amount for v2
    if (contractVersion === 'v2') {
      const amountValue = parseInt(formData.amount, 10);
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

      // Estimate fees
      const estimationResult = await estimateMintFees();

      if (!estimationResult) {
        setSnackbar({
          open: true,
          message: 'Failed to estimate minting fees. Please ensure all required fields are filled correctly.',
          severity: 'error',
        });
        setLoading(false);
        return;
      }

      const { estimatedFeeTez, estimatedStorageCostTez, totalEstimatedCostTez } = estimationResult;

      // Open confirmation dialog
      setConfirmDialog({
        open: true,
        estimatedFeeTez,
        estimatedStorageCostTez,
        estimatedGasLimit: estimationResult.estimatedGasLimit,
        estimatedStorageLimit: estimationResult.estimatedStorageLimit,
        totalEstimatedCostTez,
      });
    } catch (error) {
      console.error('Error during fee estimation:', error);
      setSnackbar({
        open: true,
        message: 'An unexpected error occurred during fee estimation. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle minting after confirmation
  const handleConfirmMint = async () => {
    setConfirmDialog({ ...confirmDialog, open: false });
    try {
      setLoading(true);

      // Retrieve the user's Tezos address
      const userAddress = await tezos.wallet.pkh();
      console.log(`User Address: ${userAddress}`);

      // For v2, enforce the 10,000 editions cap
      if (contractVersion === 'v2') {
        const currentMintedEditions = await getCurrentMintedEditions();
        const mintAmount = parseInt(formData.amount, 10);
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

      // Fetch user's balance
      const balanceMutez = await tezos.tz.getBalance(userAddress);
      const balanceTez = new BigNumber(balanceMutez.toNumber()).dividedBy(1e6);
      console.log(`User Balance: ${balanceTez} ꜩ`);

      // Check if the balance is sufficient
      if (balanceTez.isLessThan(confirmDialog.totalEstimatedCostTez)) {
        setSnackbar({
          open: true,
          message: `Insufficient balance. You need at least ${confirmDialog.totalEstimatedCostTez} ꜩ to mint this NFT.`,
          severity: 'error',
        });
        setLoading(false);
        return;
      }

      // Prepare metadata map again for the actual mint operation using the helper function
      const metadataMap = prepareMetadataMap();

      console.log('Final Metadata Map:', metadataMap);

      const contract = await tezos.wallet.at(contractAddress);
      console.log('Contract for Minting:', contract);

      // Prepare mint operation
      let mintOperation;
      if (contractVersion === 'v2') {
        mintOperation = contract.methods.mint(parseInt(formData.amount, 10), metadataMap, formData.toAddress);
      } else {
        mintOperation = contract.methods.mint(metadataMap, formData.toAddress);
      }

      console.log('Mint Operation for Sending:', mintOperation);

      // Proceed with minting
      let op;
      if (contractVersion === 'v1') {
        // v1 Mint: mint(metadata_map, to_address)
        op = await mintOperation.send();
      } else if (contractVersion === 'v2') {
        // v2 Mint: mint(amount, metadata_map, to_address)
        op = await mintOperation.send();
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
        toAddress: '',
        royalties: '',
        license: '',
        customLicense: '',
        amount: '1',
        nsfw: 'Does not contain NSFW',
        flashingHazard: 'Does not contain Flashing Hazard',
      });
      setAttributes([{ name: '', value: '' }]);
      setArtifactFile(null);
      setArtifactDataUrl(null);
      setAgreedToTerms(false);
      setTags([]);
      setTagInput('');
      setEstimation({
        estimatedFeeTez: null,
        estimatedGasLimit: null,
        estimatedStorageLimit: null,
        estimatedStorageCostTez: null,
        totalEstimatedCostTez: null,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error('Minting Error:', error);
      let errorMessage = 'Minting failed. Please try again.';
      if (error?.message) {
        errorMessage = `Minting failed: ${error.message}`;
      }
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect to verify if artifactDataUrl is set correctly
  useEffect(() => {
    if (artifactFile && !artifactDataUrl) {
      // Ensure that MintUpload calls handleFileDataUrlChange correctly
      // No additional processing needed here
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
            label={`Royalties (%) * (Maximum ${MAX_ROYALTIES}%)`}
            name="royalties"
            value={formData.royalties}
            onChange={handleInputChange}
            fullWidth
            placeholder="e.g., 10"
            type="number"
            InputProps={{ inputProps: { min: 0, max: MAX_ROYALTIES, step: 0.01 } }}
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
              <MenuItem value="On-Chain NFT License 2.0 KT1S9GHLCrGg5YwoJGDDuC347bCTikefZQ4z">
                On-Chain NFT License 2.0 KT1S9GHLCrGg5YwoJGDDuC347bCTikefZQ4z
              </MenuItem>
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
        {/* NSFW Content Dropdown */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="nsfw-label">NSFW Content</InputLabel>
            <Select
              labelId="nsfw-label"
              name="nsfw"
              value={formData.nsfw}
              onChange={handleInputChange}
              label="NSFW Content"
            >
              <MenuItem value="Does not contain NSFW">Does not contain NSFW</MenuItem>
              <MenuItem value="Does contain NSFW">Does contain NSFW</MenuItem>
            </Select>
          </FormControl>
          {/* Explanatory Text Below NSFW Dropdown */}
          <Typography variant="caption" color="textSecondary" sx={{ marginTop: '4px', display: 'block' }}>
            NSFW includes Nudity, pornography, profanity, slurs, graphic violence, or other potentially disturbing subject matter.
          </Typography>
        </Grid>
        {/* Flashing Hazards Dropdown */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="flashing-hazard-label">Flashing Hazards</InputLabel>
            <Select
              labelId="flashing-hazard-label"
              name="flashingHazard"
              value={formData.flashingHazard}
              onChange={handleInputChange}
              label="Flashing Hazards"
            >
              <MenuItem value="Does not contain Flashing Hazard">Does not contain Flashing Hazard</MenuItem>
              <MenuItem value="Does contain Flashing Hazard">
                Does contain Flashing Hazard
              </MenuItem>
            </Select>
            <Typography variant="caption" display="block" sx={{ marginTop: '4px' }}>
              <Link href="https://kb.daisy.org/publishing/docs/metadata/schema.org/accessibilityHazard.html#value" target="_blank" rel="noopener noreferrer">
                Learn More
              </Link>
            </Typography>
          </FormControl>
        </Grid>
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
                  <IconButton onClick={addAttribute} color="primary" aria-label="Add Attribute">
                    <AddCircleIcon />
                  </IconButton>
                ) : (
                  <IconButton onClick={() => removeAttribute(index)} color="secondary" aria-label="Remove Attribute">
                    <RemoveCircleIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}
        </Grid>
        {/* Tags */}
        <Grid item xs={12}>
          <Typography variant="body1">Tags *</Typography>
          <Box
            component="div"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              marginTop: '8px',
            }}
          >
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => removeTag(tag)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
          <TextField
            label="Add Tags"
            name="tags"
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagInputKeyDown}
            onPaste={handleTagPaste}
            fullWidth
            placeholder="Enter tags separated by commas (e.g., art, pixelart, foc)"
            inputRef={tagInputRef}
            sx={{ marginTop: '8px' }}
            disabled={tags.length >= MAX_TAGS}
          />
          <Typography variant="caption" color="textSecondary" sx={{ marginTop: '4px', display: 'block' }}>
            Tags should be alphanumeric and can include hyphens (-) and underscores (_). Maximum {MAX_TAGS} tags, each up to {MAX_TAG_LENGTH} characters.
          </Typography>
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
          onClick={handleMintButtonClick}
          disabled={loading || !agreedToTerms} // Adjusted Disabled State
          startIcon={loading && <CircularProgress size={20} />}
          aria-label="Mint NFT"
        >
          {loading ? 'Preparing...' : 'Mint NFT'}
        </Button>
      </div>
      {/* Display Estimation Results */}
      {estimation.estimatedFeeTez && (
        <Section>
          <Typography variant="subtitle1">Estimated Fees:</Typography>
          <Typography variant="body2">
            <strong>Fee:</strong> {estimation.estimatedFeeTez} ꜩ{' '}
            <Tooltip title="The network fee required to process the minting transaction on the Tezos blockchain." arrow>
              <InfoIcon fontSize="small" sx={{ marginLeft: '5px', verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2">
            <strong>Storage Cost:</strong> {estimation.estimatedStorageCostTez} ꜩ{' '}
            <Tooltip title="The cost for storing your NFT's data and metadata on the blockchain." arrow>
              <InfoIcon fontSize="small" sx={{ marginLeft: '5px', verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2" sx={{ marginTop: '10px' }}>
            <strong>Total Estimated Cost:</strong> {estimation.totalEstimatedCostTez} ꜩ{' '}
            <Tooltip title="The sum of the network fee and storage cost required to mint your NFT." arrow>
              <InfoIcon fontSize="small" sx={{ marginLeft: '5px', verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
          </Typography>
        </Section>
      )}
      {/* Add the desired text after the Mint button */}
      <Section>
        <Typography variant="body2" sx={{ marginTop: '10px', textAlign: 'right' }}>
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
            sx={{
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
            sx={{ marginTop: '10px' }}
          >
            Copy Contract Address
          </Button>
          <Typography variant="body2" sx={{ marginTop: '10px' }}>
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
              ghostnet.objkt.com
            </Link>{' '}
            to verify your contract.
          </Typography>
        </Section>
      )}
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        aria-labelledby="mint-confirmation-dialog"
      >
        <DialogTitle id="mint-confirmation-dialog">Confirm Minting</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please review the estimated fees and gas costs before proceeding with minting your NFT.
          </DialogContentText>
          <Typography variant="body2" sx={{ marginTop: '10px' }}>
            <strong>Estimated Fee:</strong> {confirmDialog.estimatedFeeTez} ꜩ{' '}
            <Tooltip title="The network fee required to process the minting transaction on the Tezos blockchain." arrow>
              <InfoIcon fontSize="small" sx={{ marginLeft: '5px', verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2">
            <strong>Estimated Storage Cost:</strong> {confirmDialog.estimatedStorageCostTez} ꜩ{' '}
            <Tooltip title="The cost for storing your NFT's data and metadata on the blockchain." arrow>
              <InfoIcon fontSize="small" sx={{ marginLeft: '5px', verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2">
            <strong>Estimated Gas Limit:</strong> {confirmDialog.estimatedGasLimit}
          </Typography>
          <Typography variant="body2">
            <strong>Estimated Storage Limit:</strong> {confirmDialog.estimatedStorageLimit}
          </Typography>
          <Typography variant="body2" sx={{ marginTop: '10px' }}>
            <strong>Total Estimated Cost:</strong> {confirmDialog.totalEstimatedCostTez} ꜩ{' '}
            <Tooltip title="The sum of the network fee and storage cost required to mint your NFT." arrow>
              <InfoIcon fontSize="small" sx={{ marginLeft: '5px', verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirmMint} color="primary" variant="contained" autoFocus>
            Confirm Mint
          </Button>
        </DialogActions>
      </Dialog>
      {/* Removed Local Snackbar */}
    </div>
  );
};

export default Mint;
