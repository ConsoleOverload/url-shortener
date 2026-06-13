import { useState } from 'react';
import api from './api/axios';
import { 
  Link2, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  Loader2
} from 'lucide-react';

function App() {
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiryValue, setExpiryValue] = useState('');
  const [expiryUnit, setExpiryUnit] = useState('minutes'); // 'minutes' | 'hours'
  const [useExpiry, setUseExpiry] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const validateInput = () => {
    if (!url.trim()) {
      setError('Please enter a destination URL.');
      return false;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return false;
    }

    if (customAlias.trim() && (customAlias.length < 3 || customAlias.length > 30)) {
      setError('Custom alias must be between 3 and 30 characters.');
      return false;
    }

    if (useExpiry) {
      const val = parseInt(expiryValue, 10);
      if (isNaN(val) || val <= 0) {
        setError('Please enter a valid expiration duration greater than 0.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setCopied(false);

    if (!validateInput()) {
      return;
    }

    setIsLoading(true);

    try {
      let expiresAt = null;
      if (useExpiry && expiryValue) {
        const amount = parseInt(expiryValue, 10);
        const msOffset = expiryUnit === 'hours' ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
        expiresAt = new Date(Date.now() + msOffset).toISOString();
      }

      const response = await api.post('/shorten', {
        url: url.trim(),
        originalUrl: url.trim(),
        customAlias: customAlias.trim() || undefined,
        expiresAt: expiresAt || undefined
      });

      if (response.data && response.data.success) {
        setResult(response.data.data);
      } else {
        setError('Failed to generate short URL. Unexpected response format.');
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Something went wrong. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            ZipLink
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Create clean, memorable, and self-expiring shortcuts for your long destination URLs.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xl shadow-slate-100 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Long URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Destination URL <span className="text-blue-500">*</span>
              </label>
              <div className="relative rounded-xl border border-slate-200 bg-white transition-all duration-150 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                <Link2 className="absolute left-3.5 top-3.5 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="https://example.com/very/long/destination/path"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-transparent pl-11 pr-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Custom Alias */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Custom Alias
                </label>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                  Optional
                </span>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-white transition-all duration-150 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                <span className="absolute left-3.5 top-3 text-sm font-medium text-slate-400 select-none">
                  ziplink/
                </span>
                <input
                  type="text"
                  placeholder="e.g. promo-2026"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  className="w-full bg-transparent pl-[64px] pr-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Expiration Settings */}
            <div className="pt-2.5 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={useExpiry}
                  onChange={(e) => setUseExpiry(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition"
                />
                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                  Set link expiration time
                </span>
              </label>

              {useExpiry && (
                <div className="flex gap-3 mt-3 animate-fadeIn">
                  <div className="w-1/2 relative rounded-xl border border-slate-200 bg-white transition-all duration-150 focus-within:border-blue-500">
                    <Clock className="absolute left-3 top-3 text-slate-400 h-4 w-4" />
                    <input
                      type="number"
                      placeholder="Duration"
                      value={expiryValue}
                      onChange={(e) => setExpiryValue(e.target.value)}
                      className="w-full bg-transparent pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                      min="1"
                    />
                  </div>
                  <div className="w-1/2 relative rounded-xl border border-slate-200 bg-white transition-all duration-150 focus-within:border-blue-500">
                    <select
                      value={expiryUnit}
                      onChange={(e) => setExpiryUnit(e.target.value)}
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-700 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                    <span className="absolute right-3.5 top-4.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-150 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Shorten URL</span>
              )}
            </button>
          </form>

          {/* Result Section */}
          {result && (
            <div className="pt-5 border-t border-slate-100 space-y-3 animate-fadeIn">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Short URL Created
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1 rounded-xl border border-slate-200 bg-slate-50">
                  <input
                    type="text"
                    readOnly
                    value={result.shortUrl}
                    className="w-full bg-transparent px-4 py-2.5 text-sm text-blue-600 font-medium select-all focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 border ${
                    copied
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                <a
                  href={result.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  <span>Open link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {result.expiresAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Expires: {new Date(result.expiresAt).toLocaleTimeString()}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;