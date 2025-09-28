'use client';

import '@rainbow-me/rainbowkit/styles.css';

import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  base,
  sepolia,
  mainnet
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { http } from 'wagmi';

const config = getDefaultConfig({
  appName: 'LessLimit',
  projectId: '12188b59ffef9b6a24935a4dd21b4d9f', // Valid project ID
  chains: [base], // Only Base network to avoid RPC issues
  ssr: true,
  transports: {
    // Custom RPC endpoints without CORS issues
    [base.id]: http('https://mainnet.base.org/'),
    [sepolia.id]: http('https://rpc.sepolia.org'),
    [mainnet.id]: http('https://cloudflare-eth.com'),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          appInfo={{
            appName: 'LessLimit',
          }}
          showRecentTransactions={false}
          coolMode={false}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
