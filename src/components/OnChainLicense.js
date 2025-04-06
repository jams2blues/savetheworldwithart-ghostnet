/*Developed by @jams2blues with love for the Tezos community
  File: src/components/OnChainLicense.js
  Summary: Fetch SVG from on‑chain metadata (mainnet first) with correct OBJKT links
*/
import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  CircularProgress,
  Link,
  Alert,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { TezosToolkit } from '@taquito/taquito';
import OnChainLicenseSVG from './OnChainLicenseSVG';

const Container = styled(Paper)`
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  text-align: center;
  box-sizing: border-box;
  border-radius: 8px;
`;

const LICENSE_ADDRESS = 'KT1S9GHLCrGg5YwoJGDDuC347bCTikefZQ4z';
const RPCS = [
  'https://mainnet.api.tez.ie',       // ① mainnet first (real contract)
  'https://ghostnet.ecadinfra.com',   // ② ghostnet fallback (will 404)
];

const hexToString = (hex) =>
  decodeURIComponent(
    hex
      .replace(/^0x/, '')
      .match(/.{1,2}/g)
      .map((b) => '%' + b)
      .join('')
  );

export default function OnChainLicense() {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      for (const rpc of RPCS) {
        try {
          const tezos = new TezosToolkit(rpc);
          const contract = await tezos.contract.at(LICENSE_ADDRESS);
          const storage = await contract.storage();
          const metadata = storage.metadata;

          let uriHex = await metadata.get('');
          uriHex = typeof uriHex === 'string' ? uriHex : uriHex.bytes;
          const uri = hexToString(uriHex);

          if (!uri.startsWith('tezos-storage:')) throw new Error('Bad URI');

          const key = uri.replace('tezos-storage:', '');
          let contentHex = await metadata.get(key);
          contentHex = typeof contentHex === 'string' ? contentHex : contentHex.bytes;
          const metaJson = JSON.parse(hexToString(contentHex));

          const imageUri = metaJson.imageUri || '';
          if (!imageUri.startsWith('data:image/svg+xml;base64,')) throw new Error('No base64 SVG');

          const base64 = imageUri.split(',')[1];
          setSvg(atob(base64));
          setError('');
          return;
        } catch (e) {
          console.warn(`RPC ${rpc} → ${e.message} – trying next…`);
        }
      }
      setError('Failed to load on‑chain license from any RPC.');
    })().finally(() => setLoading(false));
  }, []);

  const reload = () => {
    setSvg('');
    setError('');
    setLoading(true);
    setTimeout(() => setLoading(false), 0);
  };

  return (
    <Container elevation={3}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        On‑Chain NFT License 2.0
      </Typography>

      {loading && <CircularProgress />}

      {error && (
        <>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button variant="outlined" onClick={reload}>Retry</Button>
          <OnChainLicenseSVG />
        </>
      )}

      {!loading && !error && svg && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Displayed directly from on‑chain metadata of&nbsp;
            <Link
              href={`https://objkt.com/collections/${LICENSE_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
            >
              {LICENSE_ADDRESS}
            </Link>
            .&nbsp;Immutable & uneditable. See token:&nbsp;
            <Link
              href={`https://objkt.com/tokens/${LICENSE_ADDRESS}/0`}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
            >
              {LICENSE_ADDRESS}/0
            </Link>
          </Alert>
          <div
            style={{ width: '100%', overflowX: 'hidden' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </>
      )}
    </Container>
  );
}
