import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Collections as CollectionsIcon,
  ShoppingCart as ShoppingCartIcon,
  MonetizationOn as MonetizationOnIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

function About() {
  const features = [
    {
      title: 'Wallet Integration',
      icon: <SecurityIcon />,
      items: [
        'Seamless connection with Pera Wallet and Defly Wallet',
        'Automatic wallet detection and connection',
        'Real-time wallet state management',
      ],
    },
    {
      title: 'NFT Creation & Management',
      icon: <CollectionsIcon />,
      items: [
        'Mint NFTs with IPFS metadata storage (via Pinata)',
        'Support for multiple media formats (Images, Videos, Audio)',
        'Automatic metadata generation and storage',
        'View and manage your NFT collection',
      ],
    },
    {
      title: 'Marketplace Operations',
      icon: <ShoppingCartIcon />,
      items: [
        'List NFTs for sale with custom pricing',
        'Buy NFTs from the marketplace',
        'Unlist NFTs from the marketplace',
        'View all listed NFTs',
        'Track NFT ownership and transfers',
      ],
    },
    {
      title: 'Revenue Generation',
      icon: <MonetizationOnIcon />,
      items: [
        'Configurable listing fees',
        'Customizable buying fees',
        'Unlisting fee options',
        'Revenue collection in your wallet',
      ],
    },
    {
      title: 'SDK Features',
      icon: <CodeIcon />,
      items: [
        'Minimizable UI with floating button',
        'Customizable toast notifications',
        'Configurable UI positioning',
        'Custom logo support',
        'Real-time event system for frontend integration',
        'Support for both Testnet and Mainnet',
      ],
    },
  ];

  return (
    <>
      <h2 className="page-title">About AlgoMintX</h2>
      <div className="about-content">
        <h3>Welcome to AlgoMintX Demo</h3>
        <p>
          AlgoMintX is a powerful NFT marketplace SDK built on the Algorand
          blockchain. This demo showcases the full potential of our SDK,
          demonstrating how easily you can integrate a complete NFT
          marketplace into your application.
        </p>

        <h3>Core Features</h3>
        <div className="feature-section">
          <h4>🔐 Wallet Integration</h4>
          <ul>
            <li>Seamless connection with Pera Wallet and Defly Wallet</li>
            <li>Automatic wallet detection and connection</li>
            <li>Real-time wallet state management</li>
          </ul>

          <h4>🎨 NFT Creation & Management</h4>
          <ul>
            <li>Mint NFTs with IPFS metadata storage (via Pinata)</li>
            <li>Support for multiple media formats (Images, Videos, Audio)</li>
            <li>Automatic metadata generation and storage</li>
            <li>View and manage your NFT collection</li>
          </ul>

          <h4>💰 Marketplace Operations</h4>
          <ul>
            <li>List NFTs for sale with custom pricing</li>
            <li>Buy NFTs from the marketplace</li>
            <li>Unlist NFTs from the marketplace</li>
            <li>View all listed NFTs</li>
            <li>Track NFT ownership and transfers</li>
          </ul>

          <h4>💸 Revenue Generation</h4>
          <ul>
            <li>Configurable listing fees</li>
            <li>Customizable buying fees</li>
            <li>Unlisting fee options</li>
            <li>Revenue collection in your wallet</li>
          </ul>

          <h4>🎯 SDK Features</h4>
          <ul>
            <li>Minimizable UI with floating button</li>
            <li>Customizable toast notifications</li>
            <li>Configurable UI positioning</li>
            <li>Custom logo support</li>
            <li>Real-time event system for frontend integration</li>
            <li>Support for both Testnet and Mainnet</li>
          </ul>
        </div>

        <h3>Getting Started</h3>
        <p>To experience the full functionality of AlgoMintX:</p>
        <ol>
          <li>Connect your wallet using the SDK interface</li>
          <li>Browse the marketplace to view listed NFTs</li>
          <li>Create your own NFTs using the minting interface</li>
          <li>List your NFTs for sale with custom pricing</li>
          <li>Buy NFTs from other creators</li>
          <li>Manage your NFT collection in your profile</li>
        </ol>

        <h3>Technical Integration</h3>
        <p>
          The AlgoMintX SDK is designed for easy integration into any web
          application. With just a few lines of code, you can add a complete
          NFT marketplace to your platform:
        </p>
        <pre>
          <code>{`window.algoMintXClient = new window.AlgoMintX({
  pinata_ipfs_server_key: "YOUR_PINATA_KEY",
  pinata_ipfs_gateway_url: "YOUR_PINATA_GATEWAY",
  env: "testnet",
  namespace: "YOUR_NAMESPACE",
  revenueWalletAddress: "YOUR_WALLET",
  // Optional configurations
  listingFee: 0.1,
  buyingFee: 0.5,
  unListingFee: 0.1,
  disableToast: false,
  toastLocation: "TOP_RIGHT",
  minimizeUILocation: "right",
  logo: "./logo.png",
  supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"]
});`}</code>
        </pre>

        <p>
          This demo showcases just a fraction of what's possible with
          AlgoMintX. The SDK is continuously evolving with new features and
          improvements to provide the best NFT marketplace experience on
          Algorand.
        </p>
      </div>
    </>
  );
}

export default About; 