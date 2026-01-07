import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';

// Create public client for reading from blockchain
export const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});
