import { useState } from 'react'
import { createPublicClient, createWalletClient, custom } from 'viem'
import { arbitrum } from 'viem/chains'

// USDC contract address on Arbitrum
const USDC_CONTRACT_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const

// ERC20 ABI - only the balanceOf function
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const

interface UsdcBalanceProps {
  publicClient: ReturnType<typeof createPublicClient>
}

function UsdcBalance({ publicClient }: UsdcBalanceProps) {
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [walletType, setWalletType] = useState<string | null>(null)

  // Helper function to detect OKX wallet
  const getWalletProvider = () => {
    // Check for OKX wallet first
    if (window.okxwallet) {
      return { provider: window.okxwallet, type: 'OKX Wallet' }
    }
    // Check if window.ethereum is OKX
    if (window.ethereum && (window.ethereum.isOkxWallet || window.ethereum.isOKXWallet)) {
      return { provider: window.ethereum, type: 'OKX Wallet' }
    }
    // Fallback to window.ethereum (MetaMask or other wallets)
    if (window.ethereum) {
      return { provider: window.ethereum, type: window.ethereum.isMetaMask ? 'MetaMask' : 'Web3 Wallet' }
    }
    return null
  }

  const connectWallet = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Detect wallet provider
      const walletDetection = getWalletProvider()

      if (!walletDetection) {
        setError('No wallet found. Please install OKX Wallet or another Web3 wallet.')
        return
      }

      setWalletType(walletDetection.type)

      // Create wallet client
      const walletClient = createWalletClient({
        chain: arbitrum,
        transport: custom(walletDetection.provider),
      })

      // Request wallet connection
      const [connectedAddress] = await walletClient.requestAddresses()
      setAddress(connectedAddress)

      // Get the chain ID
      const chainId = await walletClient.getChainId()

      // Check if we're on Arbitrum
      if (chainId !== arbitrum.id) {
        setError(`Wrong network! Please switch to Arbitrum (chain ID: ${arbitrum.id}). Current chain ID: ${chainId}`)
        return
      }

      // Fetch USDC balance
      const balanceBigInt = await publicClient.readContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [connectedAddress],
      })

      // Convert to decimal (USDC has 6 decimals)
      const balanceDecimal = Number(balanceBigInt) / 1_000_000
      setBalance(balanceDecimal.toFixed(2))
    } catch (err) {
      console.error('Error connecting wallet:', err)
      setError('Failed to connect wallet or fetch balance. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const truncateAddress = (addr: `0x${string}`) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="usdc-balance-container">
      <h1>USDC Balance Checker</h1>
      <p className="subtitle">Check your USDC balance on Arbitrum</p>

      {!address ? (
        <button
          className="connect-button"
          onClick={connectWallet}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="balance-card">
          <p className="address-label">Connected Address:</p>
          <p className="address">{truncateAddress(address)}</p>

          {walletType && (
            <p className="address" style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5rem' }}>
              Wallet: {walletType}
            </p>
          )}

          <div className="balance-section">
            <p className="balance-label">USDC Balance on Arbitrum:</p>
            <p className="balance-amount">{balance} USDC</p>
          </div>

          <button
            className="disconnect-button"
            onClick={() => {
              setAddress(null)
              setBalance('0')
              setError(null)
              setWalletType(null)
            }}
          >
            Disconnect
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

export default UsdcBalance
