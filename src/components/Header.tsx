import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Wallet, X } from "lucide-react";
import { useApp } from "../AppContext";
import { shortAddress } from "../utils";

export function Header() {
  const { account, isSepolia, status, connect, disconnect, switchToSepolia } = useApp();
  const [walletOpen, setWalletOpen] = useState(false);

  const handleWalletClick = () => {
    if (!account) {
      connect();
      return;
    }
    setWalletOpen((open) => !open);
  };

  const handleDisconnect = () => {
    disconnect();
    setWalletOpen(false);
  };

  return (
    <header className={`site-header ${account && !isSepolia ? "chain-warning" : ""}`}>
      <Link className="brand" to="/">Forgotten Worlds</Link>
      <nav className="main-tabs">
        <NavLink to="/" end>Mint</NavLink>
        <NavLink to="/marketplace">Marketplace</NavLink>
      </nav>
      {account && !isSepolia && (
        <button className="switch-pill" onClick={switchToSepolia}>
          Switch to Sepolia
        </button>
      )}
      <div className="header-actions">
        <div className="wallet-menu">
        <button className="wallet-button wallet-trigger" type="button" onClick={handleWalletClick} aria-expanded={walletOpen}>
          <span className={`wallet-dot ${status.type === "loading" ? "pending" : ""}`} />
          {account && <span className="wallet-address">{shortAddress(account)}</span>}
          <Wallet size={16} />
        </button>
          {account && walletOpen && (
            <div className="wallet-popover">
              <button className="wallet-popover-close" type="button" onClick={() => setWalletOpen(false)} aria-label="Close wallet menu">
                <X size={15} />
              </button>
              <span>Connected wallet</span>
              <strong>{shortAddress(account)}</strong>
              <button type="button" onClick={() => navigator.clipboard?.writeText(account)}>Copy address</button>
              <button type="button" onClick={handleDisconnect}>Disconnect</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
