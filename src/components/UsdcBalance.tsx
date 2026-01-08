import { useAccount, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// USDC contract address on Arbitrum
const USDC_CONTRACT_ADDRESS =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;

// ERC20 ABI - only the balanceOf function
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;

interface UsdcBalanceProps {
  publicClient?: any; // Deprecated prop
}

function UsdcBalance({}: UsdcBalanceProps) {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const balance =
    balanceData !== undefined
      ? (Number(balanceData) / 1_000_000).toFixed(2)
      : '0';

  const truncateAddress = (addr: `0x${string}`) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="usdc-balance-container">
      <h1>USDC Balance Checker</h1>
      <p className="subtitle">Check your USDC balance on Arbitrum</p>

      <div
        style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}
      >
        <ConnectButton />
      </div>

      {isConnected && address && (
        <div className="balance-card">
          <p className="address-label">Connected Address:</p>
          <p className="address">{truncateAddress(address)}</p>

          <div className="balance-section">
            <p className="balance-label">USDC Balance on Arbitrum:</p>
            <p className="balance-amount">{balance} USDC</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsdcBalance;
