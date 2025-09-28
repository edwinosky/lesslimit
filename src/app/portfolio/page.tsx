"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useAccount } from 'wagmi';
import { Navbar } from "@/components/Navbar";

interface PortfolioData {
  trades: any[];
  positions: any[];
  history: any[];
  points: any[];
  balance?: number;
  totalPnL?: number;
}

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<'trades' | 'positions' | 'history' | 'points'>('trades');
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    trades: [],
    positions: [],
    history: [],
    points: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const { address, isConnected } = useAccount();

  // Fetch portfolio data with authentication check
  const fetchPortfolioData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);

    try {
      // Check authentication
      const authResponse = await axios.get("/api/proxy/markets/active", { withCredentials: true });

      if (authResponse.status === 200) {
        setIsAuthenticated(true);

        console.log("📊 Actualizando portfolio en tiempo real...");

        // Fetch real portfolio data - only endpoints that exist
        const endpoints = [
          '/portfolio/trades',     // Real trades from API
          '/portfolio/positions',  // Real positions from API
          '/portfolio/history',    // Real history from API
          '/portfolio/points'      // Real points from API
        ];

        const axiosConfig = {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        };

        // Fetch all data concurrently
        const responses = await Promise.allSettled(endpoints.map(endpoint =>
          axios.get(`/api/proxy${endpoint}`, axiosConfig)
        ));

        // Process responses - only 4 endpoints now (no balance endpoint)
        const [tradesRes, positionsRes, historyRes, pointsRes] = responses;

        // Calculate available balance from positions data since /portfolio/balance doesn't exist
        let calculatedBalance = 0;
        let calculatedPnL = 0;

        if (positionsRes.status === 'fulfilled' && positionsRes.value.data) {
          const positionsData = positionsRes.value.data;
          const positionsArray = (positionsData.clob || []).concat(positionsData.amm || []);

          // Calculate total P&L from all positions
          calculatedPnL = positionsArray.reduce((total: number, position: any) => {
            if (position.positions) {
              return total + Object.values(position.positions).reduce((posTotal: number, pos: any) => {
                return posTotal + parseFloat(pos.realisedPnl || 0) + parseFloat(pos.unrealizedPnl || 0);
              }, 0);
            }
            return total;
          }, 0);

          // Calculate available balance from AMM collateral positions
          if (positionsData.amm) {
            calculatedBalance = positionsData.amm.reduce((total: number, ammPos: any) => {
              return total + parseFloat(ammPos.collateralAmount || 0) / 1000000; // USDC 6 decimals
            }, 0);
          }
        }

        const realPortfolioData = {
          balance: calculatedBalance, // Real balance calculated from positions
          totalPnL: calculatedPnL / 1000000, // Real P&L calculated from positions
          trades: tradesRes.status === 'fulfilled' ? tradesRes.value.data || [] : portfolioData.trades || [],
          positions: positionsRes.status === 'fulfilled' ?
            (positionsRes.value.data?.clob || []).concat(positionsRes.value.data?.amm || []) : portfolioData.positions || [],
          history: historyRes.status === 'fulfilled' ? historyRes.value.data?.data || [] : portfolioData.history || [],
          points: pointsRes.status === 'fulfilled' ? pointsRes.value.data || [] : portfolioData.points || []
        };

        setPortfolioData(realPortfolioData);
        setLastRefresh(Date.now());

        console.log("✅ Portfolio actualizado en tiempo real");
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("❌ Error updating portfolio:", error);
      setIsAuthenticated(false);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchPortfolioData(true);

    // Auto-refresh every 60 seconds for portfolio (less frequent than markets)
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetchPortfolioData(false);
      }
    }, 60000); // 60 seconds

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  const handleClaimGains = async () => {
    setClaiming(true);
    try {
      // Implement claim functionality when available in API
      await axios.post('/api/proxy/portfolio/claim');
      alert('Ganancias reclamadas exitosamente');
    } catch (error) {
      alert('Error al reclamar ganancias');
    } finally {
      setClaiming(false);
    }
  };

  const renderTrades = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold mb-4">Trades Recientes</h3>
      {portfolioData.trades.length === 0 ? (
        <p className="text-gray-400">No hay trades recientes</p>
      ) : (
        <div className="space-y-2">
          {portfolioData.trades.map((trade, index) => {
            // Estructura esperada de trades según documentación
            console.log('Trade data:', trade);
            return (
              <div key={index} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{trade.market?.title || trade.marketName || 'Mercado Desconocido'}</p>
                    <p className="text-sm text-gray-400">
                      {trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() :
                       trade.blockTimestamp ? new Date(trade.blockTimestamp * 1000).toLocaleDateString() :
                       trade.timestamp ? new Date(trade.timestamp).toLocaleDateString() : 'Fecha no disponible'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${trade.outcomeIndex === 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.outcomeIndex === 0 ? 'YES' : trade.outcomeIndex === 1 ? 'NO' : 'Desconocido'}
                    </p>
                    <p className="text-sm">
                      ${trade.outcomeTokenAmount || trade.amount ? Number(trade.outcomeTokenAmount || trade.amount).toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPositions = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold mb-4">Posiciones Actuales</h3>
      {portfolioData.positions.length === 0 ? (
        <p className="text-gray-400">No hay posiciones abiertas</p>
      ) : (
        <div className="space-y-2">
          {portfolioData.positions.map((position, index) => {
            const marketTitle = position.market?.title || position.market?.group?.title || position.marketName || 'Mercado Desconocido';
            console.log('Position data:', position);

            return (
              <div key={index} className="bg-gray-700 p-4 rounded-lg">
                <div className="mb-3">
                  <p className="font-semibold">{marketTitle}</p>
                </div>
                {position.positions && (
                  <div className="space-y-2">
                    {Object.entries(position.positions).map(([outcome, data]: [string, any]) => (
                      <div key={outcome} className="flex justify-between items-center bg-gray-600 p-3 rounded">
                        <div>
                          <p className="text-sm font-medium capitalize">{outcome}</p>
                          <p className="text-xs text-gray-400">Cost: ${(data.cost || 0) / 1000000 || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm ${parseFloat(data.realisedPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            PnL: {parseFloat(data.realisedPnl) >= 0 ? '+' : ''}${parseFloat(data.realisedPnl || 0) / 1000000 || '0'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Market: ${(data.marketValue || 0) / 1000000 || 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold mb-4">Historial de Trading</h3>
      {portfolioData.history.length === 0 ? (
        <p className="text-gray-400">No hay historial disponible</p>
      ) : (
        <div className="space-y-2">
          {portfolioData.history.map((entry, index) => {
            console.log('History entry:', entry);
            const marketTitle = entry.market?.title || entry.market?.group?.title || entry.marketName || 'Mercado Desconocido';
            const timestamp = entry.blockTimestamp ? new Date(entry.blockTimestamp * 1000) : null;
            const strategy = entry.strategy || 'Trade';

            return (
              <div key={index} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{marketTitle}</p>
                    <p className="text-sm text-gray-400">
                      {timestamp ? timestamp.toLocaleString() : 'Fecha no disponible'}
                    </p>
                    <p className="text-xs text-gray-500">Tipo: {strategy}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${entry.outcomeIndex === 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.outcomeIndex === 0 ? 'YES' : entry.outcomeIndex === 1 ? 'NO' : 'Desconocido'}
                    </p>
                    <p className="text-sm">
                      Token Amount: {entry.outcomeTokenAmount || 'N/A'}
                    </p>
                    {entry.transactionHash && (
                      <p className="text-xs text-gray-500">
                        TX: {entry.transactionHash.slice(0, 10)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPoints = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold mb-4">Puntos y Recompensas</h3>
      {!Array.isArray(portfolioData.points) || portfolioData.points.length === 0 ? (
        <p className="text-gray-400">No hay puntos disponibles</p>
      ) : (
        <div className="space-y-2">
          {portfolioData.points.map((pointEntry, index) => (
            <div key={index} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{pointEntry.source || 'Puntos'}</p>
                  <p className="text-sm text-gray-400">Tipo: {pointEntry.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-yellow-400">{pointEntry.amount} pts</p>
                  <p className="text-sm text-gray-400">{new Date(pointEntry.earnedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSummary = () => {
    const totalTrades = portfolioData.trades?.length || 0;
    const totalPositions = portfolioData.positions?.length || 0;

    // Use real balance data from API - already converted to USD
    const availableBalance = portfolioData.balance || 0;
    const totalPnL = portfolioData.totalPnL || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-400">Available Balance</h4>
          <p className="text-2xl font-bold text-green-400">${availableBalance.toFixed(2)}</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-400">Total P&L</h4>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">{totalTrades} trades • {totalPositions} positions</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between">
          <h4 className="font-semibold text-gray-400">Acciones</h4>
          <p className="text-xs text-gray-500 mb-2">Premios y ganancias</p>
          <button
            onClick={handleClaimGains}
            disabled={claiming}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded font-semibold transition-colors"
          >
            {claiming ? 'Reclamando...' : 'Cobrar Ganancias'}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-xl">Cargando portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />

      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {!isAuthenticated ? (
          <div className="text-center min-h-[40vh] flex flex-col justify-center">
            <h2 className="text-3xl font-bold mb-4">Acceso Denegado</h2>
            <p className="mb-8 text-gray-300">
              Necesitas conectarte y autenticarte para acceder a tu portfolio
            </p>
            <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg">
              Ir a Markets e Iniciar Sesión
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-6">Portfolio</h2>

            {renderSummary()}

            <div className="mb-6">
              <div className="flex space-x-1">
                {[
                  { key: 'trades', label: 'Trades' },
                  { key: 'positions', label: 'Posiciones' },
                  { key: 'history', label: 'Historial' },
                  { key: 'points', label: 'Puntos' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                      activeTab === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-b-lg rounded-r-lg">
              {activeTab === 'trades' && renderTrades()}
              {activeTab === 'positions' && renderPositions()}
              {activeTab === 'history' && renderHistory()}
              {activeTab === 'points' && renderPoints()}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
