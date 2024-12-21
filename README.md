# SaveTheWorldWithArt.io

**SaveTheWorldWithArt.io** is a cutting-edge, web-based platform that empowers artists to create, manage, deploy, and mint NFTs directly on the Tezos blockchain. By ensuring that all art and provenance data are stored fully on-chain, SaveTheWorldWithArt.io eliminates the need for third-party storage solutions like IPFS or Arweave, providing an immutable and seamless experience for artists and collectors alike.

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Technologies](#technologies)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Usage](#usage)
  - [Connecting Your Wallet](#connecting-your-wallet)
  - [Deploying a Smart Contract](#deploying-a-smart-contract)
  - [Minting NFTs](#minting-nfts)
  - [Managing NFTs](#managing-nfts)
- [API Integration](#api-integration)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)
## Features

- **Fully On-Chain NFT Management:** Create and store NFT metadata directly on the Tezos blockchain without relying on external storage services.
- **User-Friendly Interface:** Intuitive, no-code platform designed for artists to effortlessly deploy and manage their NFT collections.
- **Seamless Blockchain Interactions:** Leverages Taquito and Beacon Wallet for smooth and secure interactions with the Tezos blockchain.
- **Multi-Edition Support:** Supports both single-edition (v1) and multiple-edition (v2) NFT contracts, allowing flexibility in your NFT offerings.
- **Real-Time Impact Metrics:** Integrates with Ecologi APIs to display live impact metrics, showcasing the environmental contributions of your NFT sales.
- **Comprehensive Contract Management:** Easily deploy, mint, burn, transfer, and manage NFT contracts without the need for external tools like Better Call Dev.
- **Impact Metrics Integration:** Integrates with Ecologi APIs to display real-time impact metrics, showcasing the environmental contributions of your NFT sales.
- **Uses the #ZeroContract version 1 for 1/1 NFTs, and Version 2 for multiple editions, created by @JestemZero on X.**

## Technologies

- **Frontend:**
  - React.js
  - Material-UI (MUI)
  - Styled-Components
- **Blockchain:**
  - Tezos Blockchain
  - Taquito Library
  - Beacon Wallet
- **APIs:**
  - Ecologi API for impact metrics
- **Development Tools:**
  - Node.js
  - npm
  - Visual Studio Code


### Folder Overview

- **public/contracts/**: Contains the Michelson smart contract files (`FOC.tz`) used for deploying NFT contracts.
- **src/components/**: Houses all React components, including those for minting, burning, transferring NFTs, and managing contracts.
- **src/contexts/**: Contains the `WalletContext.js` for managing wallet connections and interactions.
- **src/utils/**: Utility functions and API integrations, such as `ecologiApi.js` for fetching impact metrics.
- **src/**: Core application files, including routing (`App.js`), styling (`App.css`), and entry point (`index.js`).

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js** (v14 or later)
- **npm** (v6 or later)
- **Visual Studio Code** or any preferred code editor
- **Tezos Wallet** (e.g., Temple Wallet) for interacting with the platform

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/SaveTheWorldWithArt-frontend.git
   cd SaveTheWorldWithArt/frontend

### Install Dependencies

bash
Copy code
npm install
Configure Environment Variables

Create a .env file in the frontend directory and add any necessary environment variables (if applicable).

### Running the Application
Start the development server:

bash
Copy code
npm start
Open http://localhost:3000 in your browser to view the application.

### Usage
Connecting Your Wallet
Click on the Connect Wallet button in the header.
Select Beacon Wallet and approve the connection.
Ensure you're connected to the desired network (mainnet or ghostnet).
Deploying a Smart Contract
Navigate to the Deploy Contract section.
Fill in the required details, including:
NFT Collection Name
Symbol
Description
Authors and their Tezos addresses
Upload a thumbnail image (under 20KB)
Review the metadata preview.
Click Deploy Contract to initiate the deployment process.
Once deployed, your contract address will be displayed. Save this address for future interactions.
### Minting NFTs
Go to the Mint NFT section.
Select your deployed contract.
Fill in the NFT details:
Name
Description
Upload the artifact file (must be under 20KB)
Royalties (0-10%)
License information
Attributes (optional)
Tags (optional)
Recipient Tezos address
Amount (for v2 contracts)
Review and confirm the minting details.
Click Mint NFT to execute the transaction.
### Managing NFTs
Burn NFTs: Remove unwanted NFTs from circulation.
Transfer NFTs: Send NFTs to other Tezos addresses.
Update Operators: Grant or revoke operator permissions for managing your NFTs.
Balance Of: Check the NFT balance for a specific address and token ID.

### API Integration
SaveTheWorldWithArt.io integrates with the Ecologi API to display real-time impact metrics, such as:

Total Trees Planted
Total Carbon Offset
These metrics showcase the environmental contributions of @jams2blues NFT sales, aligning with the platform's mission to support sustainability.  Add my business wallet as a collaborator to your NFTs! tz1R4Uj4gtJZYZjFBiRejTZU63RvQpRXAQXs, A portion of all royalties going to this wallet will be donated to Ecologi.

### Fetching Impact Metrics
Located in src/utils/ecologiApi.js, the platform fetches data using Axios:

javascript
Copy code
import axios from 'axios';

const API_BASE_URL = 'https://public.ecologi.com/users';

export const getTotalTrees = async (username) => {
  // Implementation...
};

export const getTotalCarbonOffset = async (username) => {
  // Implementation...
};

export const getTotalImpact = async (username) => {
  // Implementation...
};
Contributing
Contributions are welcome! Please follow these steps:

Fork the Repository

Create a Feature Branch

bash
Copy code
git checkout -b feature/YourFeature
Commit Your Changes

bash
Copy code
git commit -m "Add YourFeature"
Push to the Branch

bash
Copy code
git push origin feature/YourFeature
Open a Pull Request

Provide a clear description of your changes and reference any related issues.

## License
Distributed under the MIT License. See LICENSE for more information.

### Acknowledgments
Taquito: The TypeScript library for interacting with the Tezos blockchain.
Beacon Wallet: Simplifies Tezos wallet connections.
Ecologi: For providing impactful environmental metrics.
@JestemZero and @jams2blues: For their invaluable contributions to smart contract development and the Art-Tezos Ecosystem.

SaveTheWorldWithArt.io — Fully On-Chain NFT Platform
## 1. Overview
# Two Contract Versions:

Version 1 (Single Editions): Each NFT is fully unique, one mint per token.
Version 2 (Multiple Editions): You can mint multiple editions of the same NFT at once.
Fully On-Chain Metadata:
All metadata (names, descriptions, images, etc.) is stored in (string, bytes) pairs directly on the Tezos blockchain, adhering to TZIP-12 or TZIP-16.

# 2. Key Entrypoints
Both V1 and V2 share the same basic set of entrypoints (functions you can call on the contract). You’ll see them in your front end when you’re minting or managing NFTs:

mint

V1: mint(metadata_map, to_address)
V2: mint(amount, metadata_map, to_address)
Creates a new NFT. In V2, amount is the number of editions minted at once.
burn

Removes an NFT (or an edition of it, in V2) from circulation by specifying its token ID.
balance_of

Queries NFT balances and responds via a callback.
transfer

Transfers NFTs from one address to another, used for normal ownership changes.
update_operators

Grants or revokes permission for a third party (“operator”) to manage your NFTs on your behalf.
add_parent / add_child

Lets you define hierarchical relationships between contracts (or tokens), e.g. a “child” NFT referencing another contract as a “parent.”
remove_parent / remove_child

Removes those hierarchical relationships.
# 3. Contract Storage
Each contract has a big map for metadata:

Version 1 uses (map %metadata string bytes) for per-contract data, plus a big map token_metadata for each token’s metadata.
Version 2 is similar but tracks a next_token_id to handle multiple tokens and their editions.
All NFT metadata is stored as hex-encoded JSON in (string, bytes)—the TZIP-12 standard approach.

# 4. Fully On-Chain (No IPFS)
Unlike many platforms that store the “heavy lifting” (art images, scripts, etc.) off-chain, SaveTheWorldWithArt.io stores everything within Tezos contract storage. This can be more expensive in terms of storage fees but ensures the data can’t vanish or be changed if an off-chain service fails.

# 5. File Size Constraints
Because everything’s on-chain, you currently cap each file at 20KB per minted artifact. Larger files or scripts must be chunked or compressed.

# 6. Potential Customizations
If Rocky wants to build specialized functionality:

Front-End Flow

The entire front end is a React app that allows generating metadata, uploading an artifact (<=20KB), and calling the mint entrypoint.
Additional logic can be added to gather chunked data from multiple NFTs (via add_child) if desired.
Parent/Child Relationships

You can create new references among tokens or even entire contracts.
By default, it doesn’t “merge” data automatically—your front end or a custom viewer must interpret those links and unify the data.
Cross-Chain

Not natively supported, but you can store references to external chains in metadata fields. Any cross-chain logic will be done by a custom viewer or Oracle.
# 7. Typical Workflow
Generate a contract (Version 1 or 2) via your platform.
Mint NFTs fully on-chain by providing name, description, art as a base64 data URI, etc., all within 20KB.
(Optional) Use add_child or add_parent to create advanced relationships.
Transfer or burn as desired.
# 8. If You Want to Modify or Extend
Repo Layout:
The main React code is in src/components/MintBurnTransfer. These components handle the UI for minting, burning, transferring, plus advanced stuff (attributes, parent/child, etc.).
Adding New Fields:
You can store any new top-level metadata fields (like accessibility, etc.) as metadataMap.set("someField", hexStringOfYourJSON).
Custom UI:
Rocky can create or swap out the front-end calls to these entrypoints to tailor the user experience.
9. Terms & Conditions
The docs on our terms page outline everything at a high level. For a deeper look, folks can examine:

src/components/MintBurnTransfer/Mint.js (mint logic & metadata handling)
src/components/MintBurnTransfer/Transfer.js, Burn.js, etc.
src\components\MintBurnTransfer\AddRemoveParentChild.js for the parent/child relationships.
# TL;DR
SaveTheWorldWithArt.io offers two FA2-based contracts (V1 single edition, V2 multi-edition) storing all metadata on-chain.
Key entrypoints handle mint, burn, transfer, operators, and optional parent/child references.
Everything is hex-encoded into (string, bytes) fields.
A 20KB artifact limit is enforced to keep costs manageable.
For advanced cross-chain or chunking behavior, you can build custom logic in the front end that references multiple NFTs or external chain data.
That’s the fundamental gist. If Rocky needs more detail, he can read the actual contract code or poke around your React front end to see exactly how the calls are made.
