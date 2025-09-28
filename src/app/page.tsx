"use client";

import { useState, useEffect } from "react";
import { useAccount } from 'wagmi';
import axios from "axios";
import MarketCard from "@/components/MarketCard";
import MarketFilters from "@/components/MarketFilters";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ category: 'All', sortBy: 'Trending' });
  const [marketStats, setMarketStats] = useState<Record<string, any>>({});
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const { address, isConnected, isConnecting } = useAccount();

  const handleFiltersChange = (newFilters: { category: string; sortBy: string }) => {
    setFilters(newFilters);
  };

  const getFilteredAndSortedMarkets = () => {
    let filtered = markets;

    // Filter by category
    if (filters.category !== 'All') {
      filtered = filtered.filter(market => {
        const tags = market.tags || [];
        const categoryMappings = {
          'Hourly': ['hourly', 'hour'],
          'Daily Strikes': ['daily', 'strikes', 'strike'],
          'Weekly': ['weekly', 'week'],
          'Monthly': ['monthly', 'month'],
          'Political': ['political', 'election', 'politics'],
          'Crypto': ['crypto', 'btc', 'eth', 'bitcoin', 'ethereum'],
          'Sports': ['sports', 'football', 'basketball', 'soccer'],
          'Weather': ['weather', 'temperature', 'rain']
        };
        const keywords = categoryMappings[filters.category as keyof typeof categoryMappings] || [];
        return tags.some((tag: string) => keywords.some(keyword => tag.toLowerCase().includes(keyword.toLowerCase())));
      });
    }

    // Sort markets
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'Trending':
          return (b.volume || 0) - (a.volume || 0); // Higher volume first
        case 'Ending Soon':
          const aEndTime = new Date(a.expirationDate).getTime();
          const bEndTime = new Date(b.expirationDate).getTime();
          return aEndTime - bEndTime; // Closest expiration first
        case 'High Value':
          const aLiquidity = a.liquidity || 0;
          const bLiquidity = b.liquidity || 0;
          return bLiquidity - aLiquidity; // Higher liquidity first
        case 'Newest':
          return (b.id || b.createdAt || 0) - (a.id || a.createdAt || 0);
        case 'LP Rewards':
          return Math.random() - 0.5; // Random for demo
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredMarkets = getFilteredAndSortedMarkets();

  // Fetch markets with auto-refresh
  const fetchMarkets = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);

    try {
      console.log("🔄 Actualizando datos de mercados en tiempo real...");
      const response = await axios.get("/api/proxy/markets/active", {
        withCredentials: true
      });

      const marketData = response.data.data || [];
      setMarkets(marketData);
      setLastRefresh(Date.now());

      console.log(`✅ Mercados actualizados: ${marketData.length} mercados encontrados`);
    } catch (error) {
      console.error("❌ Error actualizando mercados:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchMarkets(true);

    // Auto-refresh every 30 seconds in production
    const interval = setInterval(() => {
      fetchMarkets(false);
    }, 30000); // 30 seconds

    setRefreshInterval(interval);

    // Cleanup on unmount
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-xl">Cargando mercados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {isConnected ? (
          <>
            <div className="text-center mb-8">
              <p className="mb-2">Wallet conectada: <span className="font-mono">{address}</span></p>
              <p className="mb-8">Red: Base</p>
            </div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-center">Mercados Activos</h2>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <button
                  onClick={() => fetchMarkets(true)}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                  title="Actualizar mercados manualmente"
                >
                  🔄 Refresh
                </button>
                <span className="text-xs">
                  Última actualización: {new Date(lastRefresh).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <MarketFilters onFiltersChange={handleFiltersChange} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredMarkets.map((market, index) => (
                <MarketCard key={market.id || index} market={market} />
              ))}
            </div>
            {filteredMarkets.length === 0 && (
              <p className="text-center text-gray-400 mt-8">
                No se encontraron mercados que coincidan con los filtros seleccionados
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h2 className="text-3xl font-bold mb-4">Bienvenido a LessLimit</h2>
            <p className="mb-8 text-gray-300">Conecta tu wallet para acceder a mercados de predicciones</p>
          </div>
        )}
      </main>
    </div>
  );
}
