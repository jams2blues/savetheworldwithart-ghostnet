/*Developed by @jams2blues with love for the Tezos community
  File: src/components/OnChainLicenseSVG.js
  Summary: Full SVG license (scrollable) – replaces placeholder
*/
import React from 'react';

const svg = /* html */ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 1300" preserveAspectRatio="xMidYMin meet">
    <style>
      body{font-family:Arial,sans-serif;font-size:8px;line-height:1;color:#000;margin:0;padding:0}
      .subtitle,.title{font:700 14px Arial,sans-serif;text-anchor:middle;fill:#000}
      .subtitle{font:700 10px Arial,sans-serif}
      .line{stroke:#000;stroke-width:.5;margin-top:5px}
      ul{margin:0;padding-left:10px}
      li{margin-bottom:2px}
      hr{border:0;border-top:.5px solid #000;margin:5px 0}
      h2{font-size:12px;}
      p, ul, li{font-size:10px;}
    </style>
    <rect width="100%" height="100%" fill="#fff"/>
    <text x="425" y="50" class="title">On-Chain NFT License 2.0</text>
    <text x="425" y="70" class="subtitle">Last Revised: November 19, 2024</text>
    <path class="line" d="M24 90h802"/>
    <foreignObject x="24" y="110" width="802" height="1180">
      <body xmlns="http://www.w3.org/1999/xhtml">
        <div style="width:100%;height:100%;line-height:1;background-color:#fff; font-family:Arial,sans-serif; font-size:8px; color:#000;">
          <h2>0. Background</h2>
          <p>This On-Chain NFT License 2.0 ("License") establishes the rights and obligations of creators ("Licensor") and collectors ("Licensee") regarding Non-Fungible Tokens ("NFTs") representing original artistic works. Minted by SaveTheWorldWithArt.io, this License ensures clarity, protection, and interoperability across all blockchain platforms.</p>
          <hr/>
          <h2>1. Definitions</h2>
          <ul>
            <li><strong>"Art"</strong> refers to the original artistic work associated with the NFT, including but not limited to pixel art animations, digital illustrations, and other visual media.</li>
            <li><strong>"NFT"</strong> means any blockchain-based, non-fungible token that conforms to recognized standards (e.g., ERC-721, FA2), representing ownership or association with the Art.</li>
            <li><strong>"Licensor"</strong> refers to the original creator or artist who owns the intellectual property rights to the Art.</li>
            <li><strong>"Licensee"</strong> refers to any individual or entity that owns an NFT representing the Art.</li>
            <li><strong>"Metadata"</strong> refers to the data embedded within the NFT that describes the Art and the terms of this License.</li>
            <li><strong>"Third Party IP"</strong> means any third-party patent rights, copyrights, trade secrets, trademarks, know-how, or other intellectual property rights recognized globally.</li>
          </ul>
          <hr/>
          <h2>2. Ownership</h2>
          <p>The Licensor retains all ownership and intellectual property rights to the Art. The Licensee acknowledges that the NFT is a digital representation of the Art and does not confer ownership of the underlying intellectual property, except as explicitly granted in this License.</p>
          <hr/>
          <h2>3. Grant of Rights</h2>
          <p>Subject to this License's terms, the Licensor grants the Licensee a non-exclusive, worldwide, royalty-free license to:</p>
          <ul>
            <li><strong>Use and Display:</strong> Use, display, and publicly exhibit the Art as represented by the NFT.</li>
            <li><strong>Personal Use:</strong> Incorporate the Art into personal, non-commercial projects.</li>
          </ul>
          <p>This license is tied to NFT ownership and transfers with the NFT per blockchain transfer mechanisms.</p>
          <hr/>
          <h2>4. License Restrictions</h2>
          <p>The Licensee shall not:</p>
          <ul>
            <li><strong>Modify or Derive:</strong> Modify, adapt, or create derivative works based on the Art.</li>
            <li><strong>Commercial Exploitation:</strong> Sell, sublicense, rent, lease, distribute, or transfer the Art or rights herein except as permitted.</li>
            <li><strong>Unauthorized Usage:</strong> Use the Art in ways that infringe Licensor's or third parties' rights or are defamatory, obscene, or objectionable.</li>
            <li><strong>Reverse Engineering:</strong> Reverse engineer, decompile, or attempt to discover the smart contract's source code associated with the NFT.</li>
          </ul>
          <hr/>
          <h2>5. Third Party Intellectual Property (IP)</h2>
          <p>If the Art incorporates any Third Party IP, the Licensee acknowledges that:</p>
          <ul>
            <li><strong>No Additional Rights:</strong> This License does not grant rights to Third Party IP beyond those explicitly stated.</li>
            <li><strong>Compliance:</strong> The Licensee must comply with any additional terms imposed by Third Party IP owners.</li>
            <li><strong>Indemnification:</strong> The Licensee indemnizes and holds harmless the Licensor from any claims arising from the Licensee's use of Third Party IP in violation of this License or applicable laws.</li>
          </ul>
          <hr/>
          <h2>6. Rights Retained by Licensor</h2>
          <p>The Licensor retains all rights not expressly granted, including:</p>
          <ul>
            <li><strong>Reproduction Rights:</strong> Use, reproduce, modify, and distribute the Art in any form or medium.</li>
            <li><strong>NFT Creation:</strong> Create additional NFTs representing the same or derivative Art.</li>
            <li><strong>License Modification:</strong> Mint new License versions (e.g., On-Chain NFT License 3.0) as needed for updates.</li>
          </ul>
          <hr/>
          <h2>7. Termination</h2>
          <p>This License is effective until terminated. The Licensee's rights terminate automatically without notice if they fail to comply with any License terms. Upon termination, the Licensee must cease all Art use and destroy all copies in their possession.</p>
          <hr/>
          <h2>8. No Warranty</h2>
          <p>The Art is provided "as is," without warranty of any kind, express or implied, including merchantability, fitness for a particular purpose, or non-infringement. The Licensor does not guarantee the Art is defect-free or that its use will be uninterrupted or error-free.</p>
          <hr/>
          <h2>9. Limitation of Liability</h2>
          <p>The Licensor is not liable for any damages arising from the use or inability to use the Art, even if advised of such possibilities.</p>
          <hr/>
          <h2>10. Governing Law</h2>
          <p>This License is governed by and construed in accordance with the principles of international law, without regard to conflict of law provisions. Both parties agree to comply with all applicable laws and regulations in their respective jurisdictions.</p>
          <hr/>
          <h2>11. Entire Agreement</h2>
          <p>This License constitutes the entire agreement between the Licensor and Licensee regarding its subject matter, superseding all prior understandings or agreements, written or oral.</p>
          <hr/>
          <h2>12. Amendments</h2>
          <p>Given the immutable nature of this on-chain License, amendments are not possible post-deployment. To introduce changes, the Licensor will mint a new License version (e.g., On-Chain NFT License 2.0). Existing NFTs referencing On-Chain NFT License 2.0 adhere to the original terms.</p>
          <hr/>
          <h2>13. Miscellaneous</h2>
          <ul>
            <li><strong>Severability:</strong> If any provision is unenforceable, the remaining provisions remain in effect.</li>
            <li><strong>Assignment:</strong> The Licensee may not assign or transfer this License without the Licensor's prior written consent.</li>
            <li><strong>No Third-Party Beneficiaries:</strong> This License is solely for the benefit of the Licensor and Licensee, conferring no rights to others.</li>
          </ul>
          <p>By owning the NFT, the Licensee acknowledges and agrees to the terms of this On-Chain NFT License 2.0.</p>
        </div>
      </body>
    </foreignObject>
  </svg>`;

const OnChainLicenseSVG = () => (
  <div style={{ width: '100%', overflowX: 'hidden' }}
       dangerouslySetInnerHTML={{ __html: svg }} />
);

export default OnChainLicenseSVG;
