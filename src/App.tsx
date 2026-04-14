/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  TrendingUp, 
  Percent, 
  Calculator, 
  Info, 
  ArrowRightLeft,
  Store,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---
interface Rates {
  [key: string]: number;
}

interface ExchangeData {
  rates: Rates;
  lastUpdated: number;
}

const CURRENCIES = ['IDR', 'TWD', 'USD', 'MYR', 'CAD'];
const STORAGE_KEY = 'bali_vibe_rates';
const TAX_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '+10% (PB1)', value: 0.10 },
  { label: '+21% (Svc+PB1)', value: 0.21 },
];

export default function App() {
  // --- State ---
  const [rates, setRates] = useState<Rates | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Input State
  const [idrKInput, setIdrKInput] = useState<string>('100'); // Default 100k
  const [selectedTax, setSelectedTax] = useState(0);
  const [selectedShopCurrency, setSelectedShopCurrency] = useState('TWD');
  const [shopRate, setShopRate] = useState<string>(''); // For comparison
  
  // UI State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- Logic ---
  const rawIdr = useMemo(() => {
    const val = parseFloat(idrKInput) || 0;
    return val * 1000;
  }, [idrKInput]);

  const taxedIdr = useMemo(() => {
    return rawIdr * (1 + selectedTax);
  }, [rawIdr, selectedTax]);

  // Fetch Rates
  const fetchRates = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      // Check cache first if not forced
      if (!force) {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed: ExchangeData = JSON.parse(cached);
          const now = Date.now();
          // Cache for 6 hours
          if (now - parsed.lastUpdated < 6 * 60 * 60 * 1000) {
            setRates(parsed.rates);
            setLastUpdated(parsed.lastUpdated);
            setLoading(false);
            return;
          }
        }
      }

      const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
      const url = apiKey 
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/IDR`
        : `https://open.er-api.com/v6/latest/IDR`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch rates');
      
      const data = await response.json();
      const newRates = data.rates || data.conversion_rates;
      
      if (!newRates) throw new Error('Invalid data format');

      const exchangeData: ExchangeData = {
        rates: newRates,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(exchangeData));
      setRates(newRates);
      setLastUpdated(exchangeData.lastUpdated);
    } catch (err) {
      console.error(err);
      setError('Could not update rates. Using offline data if available.');
      // Fallback to cache if fetch fails
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: ExchangeData = JSON.parse(cached);
        setRates(parsed.rates);
        setLastUpdated(parsed.lastUpdated);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculations
  const convert = (to: string) => {
    if (!rates || !rates[to]) return 0;
    return taxedIdr * rates[to];
  };

  const formatCurrency = (val: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(val);
  };

  const getComparison = () => {
    if (!shopRate || !rates || !rates[selectedShopCurrency]) return null;
    const officialCurrPerIdr = rates[selectedShopCurrency];
    
    // shopRate is "IDR per 1 Foreign Currency", but user enters in 'k'
    const shopIdrPerCurr = (parseFloat(shopRate) || 0) * 1000;
    const officialIdrPerCurr = 1 / officialCurrPerIdr;
    
    const diff = shopIdrPerCurr - officialIdrPerCurr;
    const percent = (diff / officialIdrPerCurr) * 100;

    return {
      diff,
      percent,
      isBetter: diff > 0, // Higher IDR per Foreign Currency is better when selling Foreign Currency
    };
  };

  const comparison = getComparison();

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-lime-400 selection:text-black">
      {/* Header */}
      <header className="border-b-4 border-lime-400 p-6 sticky top-0 bg-black z-50 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-lime-400">BALIVIBE</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-70">Travel Currency Tool</p>
        </div>
        <div className="flex items-center gap-4">
          {isOffline && <WifiOff className="text-red-500 animate-pulse" size={20} />}
          <button 
            onClick={() => fetchRates(true)}
            disabled={loading}
            className="p-2 border-2 border-lime-400 hover:bg-lime-400 hover:text-black transition-colors active:scale-95"
          >
            <RefreshCw className={cn("size-5", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-8 pb-24">
        {/* IDR Input Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-xs uppercase font-bold text-lime-400">Amount (IDR in k)</label>
            <span className="text-[10px] opacity-50">100 = 100,000</span>
          </div>
          <div className="relative group">
            <input 
              type="number" 
              inputMode="decimal"
              value={idrKInput}
              onChange={(e) => setIdrKInput(e.target.value)}
              className="w-full bg-transparent border-4 border-white p-6 text-5xl font-black focus:border-lime-400 focus:outline-none transition-colors"
              placeholder="0"
            />
            <div className="absolute right-12 top-1/2 -translate-y-1/2 text-2xl font-bold opacity-30 group-focus-within:opacity-100 group-focus-within:text-lime-400">
              k
            </div>
            {idrKInput && (
              <button 
                onClick={() => setIdrKInput('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
          <div className="text-right text-sm opacity-70 italic">
            ≈ {formatCurrency(rawIdr, 'IDR')}
          </div>
        </section>

        {/* Tax Selector */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-lime-400">
            <Percent size={14} />
            <span>Bali Tax / Service</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TAX_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedTax(opt.value)}
                className={cn(
                  "py-3 border-2 text-xs font-bold transition-all active:scale-95",
                  selectedTax === opt.value 
                    ? "bg-lime-400 border-lime-400 text-black" 
                    : "border-white hover:border-lime-400"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {selectedTax > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 border-2 border-dashed border-lime-400/50 text-xs flex justify-between"
            >
              <span>Total with Tax:</span>
              <span className="font-bold text-lime-400">{formatCurrency(taxedIdr, 'IDR')}</span>
            </motion.div>
          )}
        </section>

        {/* Conversions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-lime-400">
            <ArrowRightLeft size={14} />
            <span>Conversions</span>
          </div>
          <div className="space-y-3">
            {CURRENCIES.filter(c => c !== 'IDR').map((curr) => (
              <motion.div 
                key={curr}
                layout
                className="border-2 border-white p-4 flex justify-between items-center hover:border-lime-400 transition-colors"
              >
                <span className="text-xl font-black">{curr}</span>
                <div className="text-right">
                  <div className="text-2xl font-black text-lime-400">
                    {formatCurrency(convert(curr), curr)}
                  </div>
                  <div className="text-[10px] opacity-50">
                    1 {curr} = {rates ? (1 / rates[curr]).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '...'} IDR
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Shop Comparison */}
        <section className="space-y-4 border-4 border-white p-4 bg-zinc-900">
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-lime-400">
            <Store size={14} />
            <span>Shop Comparison</span>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] opacity-70 uppercase tracking-wider">1. Select Currency:</p>
            <div className="grid grid-cols-4 gap-2">
              {CURRENCIES.filter(c => c !== 'IDR').map(curr => (
                <button
                  key={curr}
                  onClick={() => {
                    setSelectedShopCurrency(curr);
                    setShopRate(''); // Reset rate when currency changes
                  }}
                  className={cn(
                    "py-2 border-2 text-xs font-bold transition-all",
                    selectedShopCurrency === curr 
                      ? "bg-lime-400 border-lime-400 text-black" 
                      : "border-white/30 text-white/70 hover:border-white"
                  )}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <p className="text-[10px] opacity-70 uppercase tracking-wider">2. Enter shop rate (IDR in k per 1 {selectedShopCurrency}):</p>
              <span className="text-[8px] opacity-50">e.g. 15.8 = 15,800</span>
            </div>
            <div className="relative group">
              <input 
                type="number"
                inputMode="decimal"
                value={shopRate}
                onChange={(e) => setShopRate(e.target.value)}
                placeholder={`e.g. ${selectedShopCurrency === 'USD' ? '15.8' : '0.48'}`}
                className="w-full bg-black border-2 border-white p-3 pr-12 text-xl font-bold focus:border-lime-400 focus:outline-none"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold opacity-30 group-focus-within:opacity-100 group-focus-within:text-lime-400">
                k
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {comparison && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2 pt-2"
              >
                <div className={cn(
                  "p-3 text-sm font-bold flex justify-between items-center",
                  comparison.isBetter ? "bg-green-600 text-white" : "bg-red-600 text-white"
                )}
                >
                  <span>{comparison.isBetter ? 'GOOD DEAL' : 'BAD DEAL'}</span>
                  <span>{Math.abs(comparison.percent).toFixed(2)}% {comparison.isBetter ? 'more IDR' : 'less IDR'}</span>
                </div>
                <p className="text-[10px] opacity-50 italic">
                  Official: {(1 / (rates?.[selectedShopCurrency] || 1)).toLocaleString('en-US', { maximumFractionDigits: 2 })} IDR/{selectedShopCurrency}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Footer Info */}
        <footer className="pt-8 space-y-4 opacity-50 text-[10px] uppercase tracking-widest text-center">
          <div className="flex justify-center items-center gap-2">
            <Info size={12} />
            <span>Rates updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}</span>
          </div>
          <p>© 2026 BaliVibe • High Contrast Mode Active</p>
        </footer>
      </main>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-6 right-6 bg-red-600 text-white p-4 border-2 border-white flex items-center gap-3 z-[100]"
          >
            <AlertCircle size={20} />
            <span className="text-xs font-bold uppercase">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-xs underline">CLOSE</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
