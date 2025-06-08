import { useSDK } from '../hooks/useSDK';
import { Link } from 'react-router-dom';

function NFTCard({ nft, showActions = true }) {
  const { account } = useSDK();

  const renderMedia = () => {
    const isVideo = nft.metadata.image_mimetype?.startsWith('video/');
    const isAudio = nft.metadata.image_mimetype?.startsWith('audio/');

    if (isVideo) {
      return (
        <video 
          className="nft-image" 
          loop 
          playsInline
          muted
        >
          <source src={nft.metadata.image} type={nft.metadata.image_mimetype} />
          Your browser does not support the video tag.
        </video>
      );
    } else if (isAudio) {
      return (
        <div className="audio-preview">
          <img 
            src="https://img.icons8.com/ios-filled/50/ffffff/musical-notes.png" 
            alt="Audio" 
            className="audio-icon"
          />
          <audio 
            className="nft-image" 
            preload="metadata"
            muted
          >
            <source src={nft.metadata.image} type={nft.metadata.image_mimetype} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    } else {
      return (
        <img 
          src={nft.metadata.image} 
          alt={nft.metadata.name} 
          className="nft-image" 
        />
      );
    }
  };

  const handleMediaHover = (e) => {
    const isVideo = nft.metadata.image_mimetype?.startsWith('video/');
    const isAudio = nft.metadata.image_mimetype?.startsWith('audio/');
    
    if (isVideo) {
      const video = e.currentTarget.querySelector('video');
      if (video) {
        video.muted = false;
        video.volume = 0.5;
        video.play().catch(err => console.log('Video play failed:', err));
      }
    } else if (isAudio) {
      const audio = e.currentTarget.querySelector('audio');
      if (audio) {
        audio.muted = false;
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Audio play failed:', err));
      }
    }
  };

  const handleMediaLeave = (e) => {
    const isVideo = nft.metadata.image_mimetype?.startsWith('video/');
    const isAudio = nft.metadata.image_mimetype?.startsWith('audio/');
    
    if (isVideo) {
      const video = e.currentTarget.querySelector('video');
      if (video) {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
      }
    } else if (isAudio) {
      const audio = e.currentTarget.querySelector('audio');
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = true;
      }
    }
  };

  const handleAction = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    
    switch (action) {
      case 'buy':
        window.algoMintXClient.buyNFT({ assetId: nft.assetId });
        break;
      case 'unlist':
        window.algoMintXClient.unlistNFT({ assetId: nft.assetId });
        break;
      case 'list':
        window.openListNFTModal(nft.assetId);
        break;
      default:
        break;
    }
  };

  const formatWalletAddress = (address) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderActionButton = () => {
    if (!showActions) return null;

    if (nft.listing) {
      if (nft.listing.seller === account) {
        return (
          <button
            className="btn btn-warning"
            onClick={(e) => handleAction(e, 'unlist')}
          >
            Unlist NFT
          </button>
        );
      } else {
        return (
          <button
            className="btn btn-primary"
            onClick={(e) => handleAction(e, 'buy')}
          >
            Buy Now
          </button>
        );
      }
    } else if (nft.currentHolder === account) {
      return (
        <button
          className="btn btn-secondary"
          onClick={(e) => handleAction(e, 'list')}
        >
          List NFT
        </button>
      );
    }
    return null;
  };

  return (
    <div 
      className="nft-card"
      onMouseEnter={handleMediaHover}
      onMouseLeave={handleMediaLeave}
    >
      <Link to={`/nft/${nft.assetId}`}>
        {renderMedia()}
        <div className="nft-content">
          <h3 className="nft-title">{nft.metadata.name}</h3>
          <p className="nft-description">{nft.metadata.description}</p>
          {nft.listing && (
            <p className="nft-price">{nft.listing.price} ALGO</p>
          )}
          <p className="nft-wallet">
            <strong>{nft.listing ? 'Seller' : 'Owner'}:</strong>{' '}
            {formatWalletAddress(nft.listing ? nft.listing.seller : nft.currentHolder)}
          </p>
          {renderActionButton()}
        </div>
      </Link>
    </div>
  );
}

export default NFTCard; 