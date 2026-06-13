import { useState } from 'react';
import axios from 'axios';

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
      setError('Please enter a long URL.');
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

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await axios.post(`${apiUrl}/shorten`, {
        url: url.trim(),
        originalUrl: url.trim(),
        customAlias: customAlias.trim() || undefined,
        expiresAt: expiresAt || undefined
      });

      if (response.data && response.data.success) {
        setResult(response.data.data);
        console.log('');
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">URL Shortener</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create clean, short aliases for your long web links.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Destination URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="https://example.com/very/long/path/to/page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Custom Alias <span className="text-xs text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. my-promo"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="use-expiry"
                checked={useExpiry}
                onChange={(e) => setUseExpiry(e.target.checked)}
                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500 rounded"
              />
              <label htmlFor="use-expiry" className="ml-2 text-sm font-medium text-slate-700">
                Set link expiration time
              </label>
            </div>

            {useExpiry && (
              <div className="flex space-x-2 mt-2">
                <input
                  type="number"
                  placeholder="Duration"
                  value={expiryValue}
                  onChange={(e) => setExpiryValue(e.target.value)}
                  className="w-1/2 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
                <select
                  value={expiryUnit}
                  onChange={(e) => setExpiryUnit(e.target.value)}
                  className="w-1/2 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded text-sm transition-colors duration-150 flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Shorten URL'}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Short URL Created</h3>
            <div className="flex items-center justify-between space-x-2">
              <input
                type="text"
                readOnly
                value={result.shortUrl}
                className="w-full border border-slate-300 rounded bg-white px-3 py-1.5 text-sm select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded text-xs transition-colors duration-150 whitespace-nowrap min-w-[70px]"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="mt-3 flex items-center space-x-3">
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center"
              >
                Open link ↗
              </a>
              {result.expiresAt && (
                <span className="text-xs text-slate-400">
                  Expires: {new Date(result.expiresAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;