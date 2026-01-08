import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum, mainnet, optimism, polygon, base } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Viem Test App',
  projectId: 'YOUR_PROJECT_ID', // Replaced with a placeholder or actual ID if available
  chains: [arbitrum, mainnet, polygon, optimism, base],
  ssr: false, // If your dApp uses server side rendering (SSR)
});
