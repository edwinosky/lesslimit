"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from 'wagmi';
import axios from "axios";
import { ethers } from 'ethers';
import { Navbar } from "@/components/Navbar";

interface MarketData {
  id?: number;
  slug?: string;
  title?: string;
  description?: string;
  deadline?: string;
  status?: string;
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
  stats?: {
    yes: number;
    no: number;
  };
  volume?: number;
  liquidity?: number;
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

export default function Trade() {
  const searchParams = useSearchParams();
  const marketSlug = searchParams.get('market');
  const router = useRouter();

  const [market, setMarket] = useState<MarketData | null>(null);
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  const [amount, setAmount] = useState("");
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [slippage, setSlippage] = useState(5);
  const [orderType, setOrderType] = useState<"GTC" | "FOK">("GTC");

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicKey, setPublicKey] = useState("");

  const { address } = useAccount();

  // Set public key when wallet is connected
  useEffect(() => {
    if (address) {
      setPublicKey(address);
    }
  }, [address]);

  // Verificar autenticación y cargar datos del market desde API
  useEffect(() => {
    const checkAuthAndLoadMarket = async () => {
      try {
        // Verificar si estamos autenticados
        const authResponse = await axios.get("/api/proxy/markets/active", { withCredentials: true });
        if (authResponse.status === 200) {
          setIsAuthenticated(true);

          // Obtener información del market específico desde la API
          if (marketSlug) {
            console.log('Loading market details for slug:', marketSlug);

            // Obtener orderbook
            try {
              console.log('Fetching orderbook for slug:', marketSlug);
              const orderbookRes = await axios.get(`/api/proxy/markets/${marketSlug}/orderbook`, { withCredentials: true });
              if (orderbookRes.data) {
                setOrderbook(orderbookRes.data);
                console.log('Orderbook loaded:', orderbookRes.data);
              }
            } catch (error: any) {
              console.warn(`Orderbook not available for ${marketSlug}:`, error.response?.status, error.message);
              // Fallback con datos de prueba para desarrollo
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

            // Obtener órdenes del usuario
            try {
              const userOrdersRes = await axios.get(`/api/proxy/markets/${marketSlug}/user-orders`, { withCredentials: true });
              setUserOrders(userOrdersRes.data.orders || []);
            } catch (error: any) {
              console.warn(`User orders not available for ${marketSlug}:`, error.response?.status || error.message);
              // No mostrar error en consola como fatal, es normal que no haya órdenes
            }

            // Obtener detalles del market
            try {
              // GET /markets/{addressOrSlug} para obtener detalles del market
              const marketResponse = await axios.get(`/api/proxy/markets/${marketSlug}`, {
                withCredentials: true
              });

              console.log('Market details API response:', marketResponse.data);

              if (marketResponse.data) {
                setMarket(marketResponse.data);
              }
            } catch (marketError) {
              console.error('Error loading market details:', marketError);

              // Fallback con datos básicos
              setMarket({
                slug: marketSlug,
                title: marketSlug === 'unknown-market' ? 'Mercado Desconocido' : decodeURIComponent(marketSlug).split('-on-')[0].replace(/-+/g, ' '),
                description: 'Error loading market details from API',
                deadline: '2025-12-31T23:59:59Z',
                status: 'ACTIVE',
                group: { id: 1, slug: 'general', title: 'General Markets', status: 'FUNDED' }
              });
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error de autenticación:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (marketSlug) {
      checkAuthAndLoadMarket();
    } else {
      router.push('/');
    }
  }, [marketSlug, router]);

  const handleSubmitOrder = async (isBuy: boolean) => {
    if (!amount || !isAuthenticated || !market || !publicKey) {
      alert("Por favor complete todos los campos y verifique su autenticación");
      return;
    }

    setIsSubmitting(true);
    try {
      const amountNum = parseFloat(amount);
      const blockTimestamp = Math.floor(Date.now() / 1000);
      const nonce = Math.floor(Math.random() * 1000000);

      // Generate order data according to API specification - only fields for signing
      const orderDataForSigning = {
        salt: nonce,
        maker: publicKey,
        signer: publicKey,
        taker: '0x0000000000000000000000000000000000000000', // Zero address
        tokenId: orderbook?.tokenId || '0', // Use orderbook tokenId if available
        makerAmount: Math.floor(amountNum * 1e6), // Convert to USDC units (6 decimals)
        takerAmount: Math.floor(amountNum * 1e6), // Simplified calculation
        expiration: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
        nonce: nonce,
        price: BigInt(Math.floor((outcome === 'YES' ? 0.6 : 0.4) * 10 ** 18)), // Convert price to 10^18 format
        feeRateBps: 0,
        side: isBuy ? 0 : 1, // 0 = BUY, 1 = SELL
      };

      // Complete order data with signature fields added later
      const orderData = {
        ...orderDataForSigning,
        signature: '', // Will be filled after signing
        signatureType: 2, // EIP-712
      };

      console.log('Datos de orden:', orderData);

      // Create message to sign (EIP-712 format)
      const domain = {
        name: 'Limitless',
        version: '1',
        chainId: 8453, // Base network
        verifyingContract: '0x...', // Contract address would go here
      };

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
          { name: 'side', type: 'uint8' },
        ],
      };

      console.log('Solicitando firma al usuario...');

      // Sign the order data
      if (window.ethereum) {
        try {
          const from = (await window.ethereum.request({ method: 'eth_accounts' }))[0];

          // Create message to sign - for debugging, first try simple message
          const simpleMessage = `Sign order for ${isBuy ? 'BUY' : 'SELL'} ${amount} USDC in market ${marketSlug}`;

          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [simpleMessage, from],
          });

          orderData.signature = signature;
          console.log('Orden firmada:', orderData);

          // Submit the signed order to the API - convert BigInts to strings for JSON serializacion
          const orderDataForAPI = {
            ...orderData,
            price: orderData.price.toString(), // Convert BigInt to string
          };

          const orderSubmission = {
            order: orderDataForAPI,
            ownerId: 12345, // More realistic placeholder (was hardcoded to 1)
            orderType: orderType,
            marketSlug: marketSlug,
          };

          console.log('Enviando orden a la API - orderSubmission completo:', orderSubmission);
          console.log('Objeto order específico:', orderSubmission.order);
          console.log('JSON stringified (que se envía):', JSON.stringify(orderSubmission, null, 2));

          // Calculate signature message for authentication headers
          const messageForAuth = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
              ['string'],
              [`Sign order for ${isBuy ? 'BUY' : 'SELL'} ${amount} USDC in market ${marketSlug}`]
            )
          );

          // Get signature for authentication headers - send string directly (no bytes)
          const authSignature = await window.ethereum.request({
            method: 'personal_sign',
            params: [messageForAuth, from], // messageForAuth is already a string hash
          });

          const response = await axios.post('/api/proxy/orders', orderSubmission, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'X-Account': publicKey,
              'X-Signing-Message': ethers.hexlify(ethers.toUtf8Bytes(`Sign order for ${isBuy ? 'BUY' : 'SELL'} ${amount} USDC in market ${marketSlug}`)),
              'X-Signature': authSignature,
            },
          });

          console.log('Respuesta de la API:', response);

          if (response.status === 201) {
            alert(`Orden ${isBuy ? 'de compra' : 'de venta'} colocada exitosamente!`);
          }

        } catch (apiError: any) {
          console.error('Error de firma:', apiError);
          console.error('Detalles del error API:', {
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            data: apiError.response?.data,
            url: apiError.config?.url,
            method: apiError.config?.method,
            responseText: apiError.response?.request?.responseText,
          });

          // Mostrar datos específicos del error
          if (apiError.response?.data) {
            console.error('Detalles específicos del error:', JSON.stringify(apiError.response.data, null, 2));

            // Mensajes comunes de error de la API
            if (apiError.response.data.message) {
              console.error('Mensaje de error de la API:', apiError.response.data.message);
              console.error('Tipo del mensaje:', typeof apiError.response.data.message);
              console.error('Contenido del mensaje:', apiError.response.data.message);
            }
          }

          // Removed alert popup for debugging
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-xl">Cargando mercado...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />

      <div className="flex">
        {/* Panel principal (mercados) */}
        <div className="flex-1 p-8">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6">Mercados</h2>
            <Link href="/">
              <button className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded mb-6">
                ← Volver a Todos los Mercados
              </button>
            </Link>
            <div className="space-y-4">
              {/* Placeholder de market */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="font-bold text-xl mb-2">{market?.title || 'Mercado Desconocido'}</h3>
                <p className="text-gray-400 mb-4">{market?.description}</p>
                <div className="space-y-2 text-sm">
                  <p>Volume: {market?.volume || 'TBD'} USDC</p>
                  <p>Value: {market?.liquidity || 'TBD'} USDC</p>
                </div>
              </div>
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
