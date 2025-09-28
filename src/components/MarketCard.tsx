"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface MarketCardProps {
  market: any;
}

const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  const [countdown, setCountdown] = useState<string>('');
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  const marketSlug = market.slug || market.marketSlug || 'unknown-market';
  const title = market.title || 'Mercado Desconocido';
  const yesPercent = market.prices?.[0] || market.stats?.yes || market.odds?.[0] || 50.0;
  const noPercent = market.prices?.[1] || market.stats?.no || market.odds?.[1] || 50.0;
  const volume = Number(market.volumeFormatted || market.volume || 0);
  const isExpired = market.expired === true;
  const expirationTimestamp = market.expirationTimestamp || 0;
  const creator = market.creator || {};
  const expirationDate = market.expirationDate || '';
  const resolution = market.resolution || (market.conditionId ? 'Decentralized' : null);

  // Debug log
  console.log('Market debug:', {
    title,
    isExpired,
    expirationTimestamp,
    expired: market.expired,
    slug: marketSlug,
    creator,
    resolution
  });

  // Calcular countdown
  useEffect(() => {
    if (isExpired || !expirationTimestamp) return;

    const updateCountdown = () => {
      const now = Date.now();
      const endTime = expirationTimestamp;
      const diff = endTime - now;

      if (diff <= 0) {
        setCountdown('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setCountdown(`${days * 24 + hours}h ${minutes}m`);
      } else {
        setCountdown(`${hours}h ${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expirationTimestamp, isExpired]);

  // Mock historical data for chart (simplified)
  useEffect(() => {
    // Create mock data points for the chart line
    const mockData = [
      { time: '00:05', probability: yesPercent * 0.7 },
      { time: '00:10', probability: yesPercent },
    ];
    setHistoricalData(mockData);
  }, [yesPercent]);

  // Create simple price chart visualization
  const createChartPoints = () => {
    if (historicalData.length === 0) return '';

    const maxProb = 100;
    const minProb = 0;
    const chartHeight = 60;
    const chartWidth = 200;

    const points = historicalData.map((data, index) => {
      const x = (index / (historicalData.length - 1)) * chartWidth;
      const y = chartHeight - ((data.probability - minProb) / (maxProb - minProb)) * chartHeight;
      return `${x},${y}`;
    });

    return points.join(' ');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-700">
      {/* Title and Probability */}
      <div className="mb-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2 leading-tight">{title}</h3>
        <div className="flex items-baseline space-x-2 text-lg font-bold">
          <span className="text-green-400">{yesPercent.toFixed(1)}%</span>
          <span className="text-red-400">{noPercent.toFixed(1)}%</span>
          <span className="text-xs font-normal text-gray-400">Chance</span>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-3 bg-gray-700 rounded p-2">
        <div className="flex text-xs text-gray-400 mb-1">
          <span>Probability</span>
          <div className="flex-1"></div>
          <div className="flex space-x-4">
            <span>00:05</span>
            <span>00:10</span>
          </div>
        </div>
        <div className="relative">
          {/* Grid lines */}
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
          <svg width="200" height="60" className="bg-gray-600 rounded">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(perc => (
              <line
                key={perc}
                x1="0"
                y1={(100 - perc) * 0.6}
                x2="200"
                y2={(100 - perc) * 0.6}
                stroke="#4B5563"
                strokeWidth="0.5"
              />
            ))}
            {/* Chart line */}
            {historicalData.length > 1 && (
              <polyline
                points={createChartPoints()}
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Volume and Countdown */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Volume</p>
          <p className="font-semibold text-sm">{volume ? formatNumber(volume) : '0'} USDC</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">
            {creator.name ? `Created by ${creator.name}` : 'Time Left'}
          </p>
          <p className="font-semibold text-sm text-orange-400">
            {isExpired ? 'Expired' : (expirationTimestamp ? countdown : 'N/A')}
          </p>
        </div>
      </div>

      {/* Resolution info (if available) */}
      {market.condition_id && (
        <div className="text-xs text-gray-400 mb-3">
          <p>Resolution is decentralized</p>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {market.tags?.slice(0, 2).map((tag: string, index: number) => (
          <span key={index} className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">
            {tag}
          </span>
        ))}
      </div>

      {/* Trade Button */}
      <Link href={`/trade?market=${encodeURIComponent(marketSlug)}`}>
        <button className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold transition-colors">
          TRADE
        </button>
      </Link>
    </div>
  );
};

export default MarketCard;
