"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from 'wagmi';
import axios from "axios";
import { ethers } from 'ethers';
import { Navbar } from "@/components/Navbar";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface MarketData {
  id?: number;
  slug?: string;
  title?: string;
  description?: string;
  deadline?: string;
  status?: string;
  address?: string;
  collateralToken?: {
    symbol: string;
    address: string;
    decimals: number;
  };
  collateral?: {
    symbol: string;
    id: number;
    decimals: number;
  };
  group?: {
    id: number;
    slug: string;
    title: string;
    status: string;
    deadline?: string;
  };
  condition_id?: string;
  conditionId?: string;
  stats?: {
    yes: number;
    no: number;
  };
  volume?: number;
  liquidity?: number;
  positionIds?: string[];
  expired?: boolean;
}

interface OrderbookData {
  adjustedMidpoint: number;
  asks: { price: number; size: number }[];
  bids: { price: number; size: number }[];
  lastTradePrice: number;
  maxSpread: number;
  minSize: number;
  tokenId: string;
}

function TradeContent() {
  const searchParams = useSearchParams();
  const marketSlug = searchParams.get('market');
  const router = useRouter();

  // ALL useState hooks in consistent order
  const [market, setMarket] = useState<MarketData | null>(null);
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [historicalPrices, setHistoricalPrices] = useState<any[]>([]);
  const [lockedBalance, setLockedBalance] = useState<any>(null);
  const [marketEvents, setMarketEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"chart" | "orderbook" | "orders">("chart");
  const [amount, setAmount] = useState("");
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [slippage, setSlippage] = useState(5);
  const [orderType, setOrderType] = useState<"GTC" | "FOK">("GTC");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [publicKey, setPublicKey] = useState("");

  // ALL other hooks in consistent order
  const { address } = useAccount();

  // SINGLE consolidated useEffect - ensures consistent hook order and execution
  useEffect(() => {
    // Always update public key when address changes
    if (address && address !== publicKey) {
      setPublicKey(address);
    }

    // Market data loading - only when marketSlug is available
    if (!marketSlug) {
      router.push('/');
      return;
    }

    const loadAllData = async () => {
      setIsLoading(true);
      try {
        // Check authentication
        const authResponse = await axios.get("/api/proxy/markets/active", { withCredentials: true });
        if (authResponse.status === 200) {
          setIsAuthenticated(true);

          // Load ALL data in parallel for better performance
          const [orderbookRes, userOrdersRes, marketDetailsRes, historicalRes, lockedRes, eventsRes] = await Promise.allSettled([
            axios.get(`/api/proxy/markets/${marketSlug}/orderbook`, { withCredentials: true }),
            axios.get(`/api/proxy/markets/${marketSlug}/user-orders`, { withCredentials: true }),
            axios.get(`/api/proxy/markets/${marketSlug}`, { withCredentials: true }),
            axios.get(`/api/proxy/markets/${marketSlug}/historical-price`, {
              params: { interval: '1h', limit: 100 },
              withCredentials: true
            }),
            axios.get(`/api/proxy/markets/${marketSlug}/locked-balance`, { withCredentials: true }),
            axios.get(`/api/proxy/markets/${marketSlug}/events`, { withCredentials: true })
          ]);

          // Process orderbook data
          if (orderbookRes.status === 'fulfilled' && orderbookRes.value.data) {
            setOrderbook(orderbookRes.value.data);
          } else {
            setOrderbook({
              adjustedMidpoint: 0.5,
              asks: [{ price: 0.55, size: 1000 }],
              bids: [{ price: 0.45, size: 1000 }],
              lastTradePrice: 0.5,
              maxSpread: 0.1,
              minSize: 1,
              tokenId: '0x0'
            });
          }

          // Process user orders
          if (userOrdersRes.status === 'fulfilled') {
            setUserOrders(userOrdersRes.value.data?.orders || []);
          }

          // Process market details and find address from active markets
          let marketData = marketDetailsRes.status === 'fulfilled' ? marketDetailsRes.value.data : null;

          // Get address from active markets list if not in marketData
          let fullMarketsRes = null;
          if (!marketData?.address) {
            fullMarketsRes = await axios.get("/api/proxy/markets/active?page=1&limit=1000&sortBy=newest", { withCredentials: true });
            const fullMarkets = fullMarketsRes.data?.data || [];
            const activeMarket = fullMarkets.find((m: any) => m.slug === marketSlug);
            console.log('Active market found from full list:', activeMarket);
            if (activeMarket && marketData) {
              marketData.address = activeMarket.address;
              marketData.conditionId = activeMarket.conditionId;
              marketData.collateralToken = activeMarket.collateralToken;
            } else if (activeMarket && !marketData) {
              marketData = activeMarket;
            }
          }

          if (marketData) {
            setMarket(marketData);
          } else {
            setMarket({
              slug: marketSlug,
              title: decodeURIComponent(marketSlug).split('-on-')[0].replace(/-+/g, ' '),
              description: 'Market details unavailable',
              deadline: '2025-12-31T23:59:59Z',
              status: 'ACTIVE',
              group: { id: 1, slug: 'general', title: 'General Markets', status: 'FUNDED' }
            });
          }

          // Process historical prices with fallback
          if (historicalRes.status === 'fulfilled') {
            setHistoricalPrices(historicalRes.value.data || []);
          } else {
            setHistoricalPrices([
              { timestamp: Date.now() - 86400000, price: 0.45 },
              { timestamp: Date.now(), price: orderbook?.adjustedMidpoint || 0.5 }
            ]);
          }

          // Process locked balance (optional)
          if (lockedRes.status === 'fulfilled') {
            setLockedBalance(lockedRes.value.data);
          }

          // Get portfolio data to find ownerId
          try {
            const portfolioRes = await axios.get('/api/proxy/portfolio/positions', { withCredentials: true });
            console.log('Portfolio data:', portfolioRes.data); // Log to find ownerId or userId
          } catch (error) {
            console.log('Portfolio request failed:', error);
          }

          // Process market events (optional)
          if (eventsRes.status === 'fulfilled') {
            setMarketEvents(eventsRes.value.data?.events || []);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Data loading error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [marketSlug, address, publicKey, router]); // SINGLE DEPENDENCY ARRAY

  // Helper functions after hooks
  const handleSubmitOrder = async (isBuy: boolean) => {
    if (!amount || !isAuthenticated || !market || !publicKey) {
      alert("Por favor complete todos los campos y verifique su autenticación");
      return;
    }

    // Validations
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    if (!orderbook?.adjustedMidpoint) {
      alert("Orderbook no disponible, intenta de nuevo");
      return;
    }

    // Validation: Check if market is active and not expired
    if (market?.status !== 'FUNDED' || market?.expired === true) {
      alert("No se pueden colocar órdenes en mercados resueltos o expirados");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Market object:', market);
      console.log('Orderbook:', orderbook);

      const salt = Math.floor(Math.random() * 1000000);
      const basePrice = outcome === 'YES' ? (1 - orderbook.adjustedMidpoint) : orderbook.adjustedMidpoint;
      const slippageMultiplier = (100 + (isBuy ? slippage : -slippage)) / 100;
      const finalPrice = basePrice * slippageMultiplier;
      const expectedTokens = amountNum / finalPrice;
      const expirationTimestamp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

      // Select correct tokenId for the outcome
      const tokenIdForOrder = outcome === 'YES' ? market.positionIds?.[0] : market.positionIds?.[1];

      // Create order data for signing (uint256 compatible)
      const orderData = {
        salt: salt,
        maker: publicKey,
        signer: publicKey,
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: tokenIdForOrder || orderbook?.tokenId || '0',
        makerAmount: Math.floor(amountNum * (market?.collateralToken?.decimals ? 10 ** market.collateralToken.decimals : 1e6)),
        takerAmount: Math.floor(expectedTokens * 1e18),
        expiration: 0,  // No expiration as per Python example (0 for uint256)
        nonce: 0,  // nonce 0 as per Python example
        price: Math.floor(finalPrice * 1e18).toString(),  // Scaled price string for uint256 EIP-712
        feeRateBps: 0,
        side: isBuy ? 0 : 1
      };

      const domain = {
        name: 'Limitless',
        version: '1',
        chainId: 8453,
        verifyingContract: market?.address || '0x0000000000000000000000000000000000000000'
      };

      console.log('Final Domain:', domain);
      console.log('OrderData:', orderData);

      const types = {
        Order: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'signer', type: 'address' },
          { name: 'taker', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'makerAmount', type: 'uint256' },
          { name: 'takerAmount', type: 'uint256' },
          { name: 'expiration', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'feeRateBps', type: 'uint256' },
          { name: 'side', type: 'uint8' }
        ]
      };

      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts[0]) {
          alert("Wallet no conectada");
          return;
        }

        const signature = await window.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [accounts[0], JSON.stringify({ types, primaryType: 'Order', domain, message: orderData })]
        });

        // Create submission payload with expiration as string per API doc
        // Get ownerId from stored user data
        const userDataJson = localStorage.getItem('userData');
        const userData = userDataJson ? JSON.parse(userDataJson) : null;
        const ownerId = userData?.id || 0;

        const orderSubmission = {
          order: {
            ...orderData,
            expiration: "0", // String "0" for API payload per Python example
            price: finalPrice, // Decimal price for API payload per API example
            signature,
            signatureType: 0 // EOA signature as per Python example
          },
          orderType,
          marketSlug
        };

        const response = await axios.post('/api/proxy/orders', orderSubmission, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 201) {
          alert(`Orden ${isBuy ? 'de compra' : 'de venta'} colocada exitosamente!`);
          const userOrdersRes = await axios.get(`/api/proxy/markets/${marketSlug}/user-orders`, { withCredentials: true });
          setUserOrders(userOrdersRes.data.orders || []);
          setAmount("");
        }
      } else {
        alert('MetaMask no detectado. Por favor instala una wallet compatible.');
      }
    } catch (error: any) {
      console.error('Error creando orden:', error);
      alert('Error al crear orden: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateEstimatedTokens = () => {
    if (!amount || !orderbook) return 0;
    const amountNum = parseFloat(amount);
    const price = outcome === 'YES' ? (1 - orderbook.adjustedMidpoint) : orderbook.adjustedMidpoint;
    return amountNum / price || 0;
  };

  const generateTimeLeft = () => {
    if (!market?.deadline) return "N/A";
    const deadline = new Date(market.deadline).getTime();
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const cancelOrder = async (orderId: string) => {
    setIsCanceling(true);
    try {
      await axios.delete(`/api/proxy/orders/${orderId}`, { withCredentials: true });
      const userOrdersRes = await axios.get(`/api/proxy/markets/${marketSlug}/user-orders`, { withCredentials: true });
      setUserOrders(userOrdersRes.data.orders || []);
      alert('Order cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      alert('Error cancelling order: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCanceling(false);
    }
  };

  const cancelAllOrders = async () => {
    if (!marketSlug) return;

    setIsCanceling(true);
    try {
      await axios.delete(`/api/proxy/orders/all/${marketSlug}`, { withCredentials: true });
      setUserOrders([]);
      alert('All orders cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling all orders:', error);
      alert('Error cancelling orders: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCanceling(false);
    }
  };

  // Chart data - memoized to prevent infinite re-renders
  const chartData = useMemo(() => {
    if (!Array.isArray(historicalPrices) || historicalPrices.length === 0) {
      // Fallback data showing current midpoint
      return {
        datasets: [
          {
            label: 'Price',
            data: [
              { x: new Date(Date.now() - 86400000), y: 0.45 },
              { x: new Date(Date.now() - 43200000), y: 0.48 },
              { x: new Date(Date.now()), y: orderbook?.adjustedMidpoint || 0.5 }
            ],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          }
        ]
      };
    }

    // Transform historical data for Chart.js - filter out invalid points
    const validPoints = historicalPrices.filter(point =>
      point && typeof point === 'object' && (point.timestamp || point.x)
    ).map(point => ({
      x: new Date(typeof point.timestamp === 'number' ?
        (point.timestamp > 1e10 ? point.timestamp : point.timestamp * 1000) :
        point.timestamp || point.x
      ),
      y: point.price || point.midpoint || point.y || 0.5
    }));

    return {
      datasets: [
        {
          label: 'Price',
          data: validPoints,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        }
      ]
    };
  }, [historicalPrices, orderbook?.adjustedMidpoint]);

  // Chart options - memoized
  const chartOptions = useMemo(() => ({
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
        }
      },
      title: {
        display: true,
        text: `${market?.title || 'Market'} Price Chart`,
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(75, 192, 192, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `Price: ${(context.parsed.y * 100).toFixed(2)}%`,
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
          },
          tooltipFormat: 'PPpp'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      },
      y: {
        beginAtZero: true,
        max: 1,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          callback: (value: any) => Number(value).toFixed(3),
        }
      },
    },
    elements: {
      point: {
        radius: 2,
        hoverRadius: 6,
      }
    }
  }), [market?.title]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />

      <div className="flex">
        {/* Panel principal (chart, orderbook, orders) */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Link href="/">
                <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded mb-4">
                  ← Back to Markets
                </button>
              </Link>
              <h2 className="text-2xl font-bold">{market?.title || 'Market'}</h2>
              <p className="text-gray-400">{market?.description}</p>
            </div>

            {/* Tabs navegación */}
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab("chart")}
                className={`px-4 py-2 rounded-t-lg font-medium ${
                  activeTab === "chart"
                    ? "bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setActiveTab("orderbook")}
                className={`px-4 py-2 rounded-t-lg font-medium ${
                  activeTab === "orderbook"
                    ? "bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Orderbook
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 rounded-t-lg font-medium ${
                  activeTab === "orders"
                    ? "bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                My Orders
              </button>
            </div>

            {/* Tab content */}
            <div className="bg-gray-800 rounded-lg p-6">
              {activeTab === "chart" && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Price Chart</h3>
                  <div className="h-96 bg-gray-700 rounded-lg p-4">
                    <Line data={chartData} options={chartOptions} />
                    {historicalPrices.length > 0 && (
                      <div className="mt-4 text-center text-gray-400 text-sm">
                        📊 Chart showing market price evolution • {historicalPrices.length} data points loaded
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "orderbook" && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Orderbook</h3>
                  <div className="grid grid-cols-2 gap-8">
                    {/* Bids (BUY orders) */}
                    <div>
                      <h4 className="text-green-400 font-semibold mb-3">Bids (Buy)</h4>
                      <div className="space-y-1 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-gray-400 border-b border-gray-600 pb-2">
                          <span>Price</span>
                          <span>Size</span>
                          <span>Total</span>
                        </div>
                        {orderbook?.bids?.map((bid, index) => (
                          <div key={index} className="grid grid-cols-3 gap-4 text-sm hover:bg-gray-700 px-2 py-1 rounded">
                            <span className="text-green-400">{bid.price.toFixed(4)}</span>
                            <span>{bid.size.toLocaleString()}</span>
                            <span>{(bid.price * bid.size).toFixed(2)}</span>
                          </div>
                        )) || (
                          <div className="text-gray-500 text-sm">No bids available</div>
                        )}
                      </div>
                    </div>

                    {/* Asks (SELL orders) */}
                    <div>
                      <h4 className="text-red-400 font-semibold mb-3">Asks (Sell)</h4>
                      <div className="space-y-1 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-gray-400 border-b border-gray-600 pb-2">
                          <span>Price</span>
                          <span>Size</span>
                          <span>Total</span>
                        </div>
                        {orderbook?.asks?.map((ask, index) => (
                          <div key={index} className="grid grid-cols-3 gap-4 text-sm hover:bg-gray-700 px-2 py-1 rounded">
                            <span className="text-red-400">{ask.price.toFixed(4)}</span>
                            <span>{ask.size.toLocaleString()}</span>
                            <span>{(ask.price * ask.size).toFixed(2)}</span>
                          </div>
                        )) || (
                          <div className="text-gray-500 text-sm">No asks available</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Orderbook stats */}
                  <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">Midpoint</p>
                      <p className="font-semibold">{orderbook?.adjustedMidpoint?.toFixed(4) || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">Spread</p>
                      <p className="font-semibold">{orderbook?.maxSpread?.toFixed(4) || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">Min Size</p>
                      <p className="font-semibold">{orderbook?.minSize?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">Token ID</p>
                      <p className="font-semibold text-xs">{orderbook?.tokenId?.substring(0, 10) + '...' || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "orders" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">My Orders</h3>
                    {userOrders.length > 0 && (
                      <button
                        onClick={cancelAllOrders}
                        disabled={isCanceling}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded text-sm"
                      >
                        {isCanceling ? 'Cancelling...' : 'Cancel All'}
                      </button>
                    )}
                  </div>

                  {userOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No active orders
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userOrders.map((order, index) => (
                        <div key={order.id || index} className="bg-gray-700 p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`px-2 py-1 rounded text-sm font-semibold ${
                                  order.side === 'BUY' || order.side === 0
                                    ? 'bg-green-600 text-white'
                                    : 'bg-red-600 text-white'
                                }`}>
                                  {order.side === 'BUY' || order.side === 0 ? 'BUY' : 'SELL'}
                                </span>
                                <span className="font-semibold">
                                  {(order.amount || order.makerAmount || 0) / 1e6} USDC
                                </span>
                                <span className="text-gray-400">@</span>
                                <span>{order.price ? Number(order.price) / 1e18 : 'N/A'}</span>
                              </div>
                              <div className="text-sm text-gray-400">
                                Order ID: {order.id || 'N/A'} • Status: {order.status || 'Active'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Expires: {order.expiration ? new Date(Number(order.expiration) * 1000).toLocaleString() : 'N/A'}
                              </div>
                            </div>
                            <button
                              onClick={() => cancelOrder(order.id)}
                              disabled={isCanceling}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 p-2 rounded ml-4"
                              title="Cancel order"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel lateral de trading */}
        <div className="w-96 bg-gray-800 min-h-screen p-6 border-l border-gray-700">
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Trade Panel</h3>

            {/* Estado de autenticación */}
            {!isAuthenticated ? (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                <p className="font-bold">No autenticado</p>
                <p className="text-sm">Necesitas conectarte para hacer trades</p>
                <Link href="/">
                  <button className="mt-2 bg-red-700 hover:bg-red-600 px-4 py-2 rounded text-sm">
                    Ir a Conectar Wallet
                  </button>
                </Link>
              </div>
            ) : (
              <>
                {/* Información del mercado */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Ends in</span>
                    <span className="font-mono text-sm">{generateTimeLeft()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Created by</span>
                    <span className="text-sm font-semibold">{market?.group?.title || 'Limitless'} ⚡</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{market?.title}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-green-400 text-sm">YES {orderbook?.adjustedMidpoint ? (1 - orderbook.adjustedMidpoint) * 100 : '50'}%</span>
                      <span className="text-red-400 text-sm">NO {orderbook?.adjustedMidpoint ? orderbook.adjustedMidpoint * 100 : '50'}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-400">Volume</p>
                      <p className="font-semibold">{(Number(market?.volume) || Number(orderbook?.lastTradePrice) || 0).toFixed(0)} USDC</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Value</p>
                      <p className="font-semibold">{(Number(market?.liquidity) || Number(orderbook?.minSize) || 0).toFixed(0)} USDC</p>
                    </div>
                  </div>
                </div>

                {/* Formulario de trading */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">1 Enter amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-2 text-gray-400">USDC</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Slippage Tolerance</label>
                    <select
                      value={slippage}
                      onChange={(e) => setSlippage(Number(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>0.5%</option>
                      <option value={5}>5%</option>
                      <option value={10}>10%</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">2 Select outcome</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOutcome("YES")}
                        className={`px-3 py-2 rounded border-2 transition-colors ${
                          outcome === 'YES'
                            ? 'border-green-400 bg-green-400/10 text-green-400'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => setOutcome("NO")}
                        className={`px-3 py-2 rounded border-2 transition-colors ${
                          outcome === 'NO'
                            ? 'border-red-400 bg-red-400/10 text-red-400'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* Resumen de trading */}
                  {amount && (
                    <div className="bg-gray-700 p-4 rounded-lg text-sm">
                      <p className="text-gray-400 mb-2">Receive approximately</p>
                      <p className="font-semibold">{calculateEstimatedTokens().toFixed(2)} {outcome} tokens</p>
                      <p className="text-xs text-gray-500 mt-2">
                        @ {(outcome === 'YES' ?
                          ((orderbook?.adjustedMidpoint || 0.5) * 100).toFixed(1) :
                          ((1 - (orderbook?.adjustedMidpoint || 0.5)) * 100).toFixed(1)
                        )}% Chance
                      </p>
                    </div>
                  )}

                  {/* Botones de compra/venta */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSubmitOrder(true)}
                      disabled={isSubmitting || !amount}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded font-semibold transition-colors"
                    >
                      {isSubmitting ? 'Processing...' : 'BUY'}
                    </button>
                    <button
                      onClick={() => handleSubmitOrder(false)}
                      disabled={isSubmitting || !amount}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-3 rounded font-semibold transition-colors"
                    >
                      {isSubmitting ? 'Processing...' : 'SELL'}
                    </button>
                  </div>

                  {/* Órdenes existentes */}
                  {userOrders.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Your Orders</h4>
                      <div className="space-y-2">
                        {userOrders.map((order, index) => (
                          <div key={index} className="bg-gray-700 p-3 rounded text-sm">
                            <div className="flex justify-between">
                              <span className={order.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                                {order.side} {order.quantity} @
                              </span>
                              <span>{order.price}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{order.status}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Trade() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-xl">Cargando trading...</p>
      </div>
    }>
      <TradeContent />
    </Suspense>
  );
}
