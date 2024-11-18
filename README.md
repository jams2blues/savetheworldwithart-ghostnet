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