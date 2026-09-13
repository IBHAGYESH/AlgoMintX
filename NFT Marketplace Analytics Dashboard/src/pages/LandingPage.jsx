import React from 'react';
import { Link } from 'react-router-dom';
import {
  Image,
  Github,
  Sun,
  Moon,
  Wallet,
  Coins,
  Tag,
  CircleDollarSign,
  ShieldCheck,
  Sparkles,
  Server,
  Network,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import NpmLogo from '../components/NpmLogo';

const NPM_URL = 'https://www.npmjs.com/package/algomintx';
const GITHUB_URL = 'https://github.com/IBHAGYESH/AlgoMintX';

const features = [
  {
    icon: <Wallet size={22} />,
    title: 'Wallet Integration',
    text: 'Built-in Pera Wallet & Defly Wallet support with automatic session restore and one-click login.',
  },
  {
    icon: <Image size={22} />,
    title: 'NFT Minting',
    text: 'Mint NFTs to IPFS (Pinata) with ARC-3 metadata, integrity hashes and multi-media support (images, video, audio).',
  },
  {
    icon: <Coins size={22} />,
    title: 'Fungible Token Minting',
    text: 'Mint Algorand ASAs with configurable supply and decimals through the same plug-and-play flow.',
  },
  {
    icon: <Tag size={22} />,
    title: 'List, Unlist & Buy',
    text: 'Full marketplace lifecycle for NFTs and FTs — list for sale, unlist, and buy with atomic transactions.',
  },
  {
    icon: <CircleDollarSign size={22} />,
    title: 'Revenue Mechanisms',
    text: 'Configurable minting, listing, buying and unlisting fees paid straight to your revenue wallet.',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'Marketplace Discovery',
    text: 'Discover every AMX marketplace on-chain and fetch rich analytics for dashboards and explorers.',
  },
  {
    icon: <ShieldCheck size={22} />,
    title: 'No Contract Writing',
    text: 'Pre-audited smart contract ready to use — no backend and no blockchain expertise required.',
  },
  {
    icon: <Server size={22} />,
    title: 'Runs Everywhere',
    text: 'Same SDK in the browser and Node.js (headless) — mint, list and manage assets from a server.',
  },
  {
    icon: <Network size={22} />,
    title: 'Testnet & Mainnet',
    text: 'One config, two networks. Iterate on testnet, then flip env: "mainnet" when you are ready.',
  },
];

const quickStart = `import AlgoMintX from "algomintx";

const sdk = new AlgoMintX({
  env: "testnet", // testnet | mainnet
  namespace: "DEMO",
  pinata_ipfs_server_key: "<YOUR_PINATA_API_KEY>",
  revenueWalletAddress: "<YOUR_ALGORAND_WALLET>",
  marketplaceType: "NFT", // "NFT" | "FT"
  // Optional fees (in ALGO):
  mintFee: 0.1,
  listingFee: 0.1,
  buyingFee: 0.5,
  unListingFee: 0.1,
});`;

function LandingPage({ theme, onToggleTheme }) {
  return (
    <div className={`app ${theme}`}>
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <Image size={24} />
                <h1>AlgoMintX</h1>
              </div>
            </div>
            <div className="header-right">
              <span className="landing-badge">SDK</span>
              <a
                href={NPM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link landing-link"
              >
                <NpmLogo size={16} />
                npm
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link landing-link"
              >
                <Github size={16} />
                GitHub
              </a>
              <button className="theme-toggle" onClick={onToggleTheme}>
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="main">
        <div className="container">
          <section className="landing-hero">
            <div className="landing-hero-content">
              <span className="landing-kicker">The plug-and-play marketplace SDK</span>
              <h2 className="landing-title">
                Launch a full NFT / FT marketplace on Algorand in minutes.
              </h2>
              <p className="landing-subtitle">
                AlgoMintX is a white-label JavaScript SDK: drop it in, connect
                wallets, mint, list, unlist and buy — and earn revenue. No smart
                contract writing, no backend, no blockchain expertise required.
              </p>
              <div className="landing-cta-row">
                <Link to="/dashboard" className="landing-cta-primary">
                  Open Dashboard <ArrowRight size={18} />
                </Link>
                <a
                  href={NPM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="landing-cta-secondary"
                >
                  <NpmLogo size={18} /> Get it on npm
                </a>
              </div>
            </div>
          </section>

          {/* What it is */}
          <section className="landing-section">
            <h3 className="landing-section-title">What is AlgoMintX?</h3>
            <p className="landing-section-text">
              A drop-in JavaScript SDK for the Algorand blockchain that turns any
              white-label brand into a fully functional NFT or fungible-token
              marketplace. Users connect their wallet and mint, list, buy and
              unlist assets through a beautiful embedded UI — while you collect
              configurable fees on every transaction.
            </p>
          </section>

          {/* Features */}
          <section className="landing-section">
            <h3 className="landing-section-title">What it does</h3>
            <div className="landing-grid">
              {features.map((f) => (
                <div className="landing-feature" key={f.title}>
                  <div className="landing-feature-icon">{f.icon}</div>
                  <h4>{f.title}</h4>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Quick start */}
          <section className="landing-section">
            <h3 className="landing-section-title">Quick start</h3>
            <div className="landing-code">
              <pre><code>{quickStart}</code></pre>
            </div>
            <div className="landing-cta-row landing-cta-row-center">
              <Link to="/dashboard" className="landing-cta-primary">
                Explore the Analytics Dashboard <ArrowRight size={18} />
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <div className="footer-brand">
                <Image size={20} />
                <span>AlgoMintX — Algorand NFT/FT Marketplace SDK</span>
              </div>
              <p>
                Real-time marketplace analytics and a white-label NFT / FT
                marketplace SDK for the Algorand network.
              </p>
            </div>
            <div className="footer-links">
              <a
                href={NPM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <NpmLogo size={16} />
                npm Package
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <Github size={16} />
                GitHub Repository
              </a>
              <Link to="/dashboard" className="footer-link">
                <ExternalLink size={16} />
                Analytics Dashboard
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              AlgoMintX crafted with ❤️ by{' '}
              <a
                href="https://ibhagyesh.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ibhagyesh
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;