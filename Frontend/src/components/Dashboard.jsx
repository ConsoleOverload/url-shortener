import { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  History, 
  BarChart3, 
  LogOut, 
  User, 
  Copy, 
  Check, 
  Trash2, 
  QrCode, 
  ExternalLink, 
  Calendar, 
  Clock, 
  Search, 
  Link2, 
  Loader2, 
  AlertCircle, 
  Download, 
  X,
  Edit2,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  ArrowUpDown
} from 'lucide-react';
import api from '../api/axios';
import QRCode from 'qrcode';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'history' | 'analytics'
  const [urls, setUrls] = useState([]);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [urlError, setUrlError] = useState('');

  // Shortener form state
  const [originalUrl, setOriginalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [useExpiry, setUseExpiry] = useState(false);
  const [expiryValue, setExpiryValue] = useState('');
  const [expiryUnit, setExpiryUnit] = useState('minutes'); // 'minutes' | 'hours'
  const [isShortening, setIsShortening] = useState(false);
  const [shortenResult, setShortenResult] = useState(null);
  const [shortenError, setShortenError] = useState('');

  // History / Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'clicks_desc' | 'clicks_asc'
  const [copiedId, setCopiedId] = useState(null);
  
  // Custom Alias & Title Update state
  const [editingUrl, setEditingUrl] = useState(null);
  const [newAliasValue, setNewAliasValue] = useState('');
  const [newTitleValue, setNewTitleValue] = useState('');
  const [isUpdatingAlias, setIsUpdatingAlias] = useState(false);
  const [aliasUpdateError, setAliasUpdateError] = useState('');

  // QR Modal state
  const [qrUrl, setQrUrl] = useState(null);
  const [qrShortId, setQrShortId] = useState('');
  const canvasRef = useRef(null);

  // Analytics state
  const [selectedShortId, setSelectedShortId] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  // Fetch URLs for History and Stats
  const fetchUrls = async () => {
    setLoadingUrls(true);
    setUrlError('');
    try {
      const response = await api.get('/api/urls');
      if (response.data && response.data.success) {
        setUrls(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setUrlError('Failed to fetch URLs. Please reload.');
    } finally {
      setLoadingUrls(false);
    }
  };

  // Run on mount to initialize summary stats
  useEffect(() => {
    fetchUrls();
  }, []);

  // Sync list when history tab is visited
  useEffect(() => {
    if (activeTab === 'history') {
      fetchUrls();
    }
  }, [activeTab]);

  // Compute summary stats dynamically
  const totalUrls = urls.length;
  const totalClicks = urls.reduce((sum, u) => sum + (u.clickCount || 0), 0);
  const topUrl = urls.length > 0 
    ? [...urls].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))[0] 
    : null;

  // Extract destination domain for fallback display titles
  const getFallbackTitle = (urlStr) => {
    try {
      return new URL(urlStr).hostname;
    } catch (e) {
      return urlStr;
    }
  };

  // Handle URL Shortening
  const handleShorten = async (e) => {
    e.preventDefault();
    setShortenError('');
    setShortenResult(null);

    if (!originalUrl.trim()) {
      setShortenError('Please enter a destination URL.');
      return;
    }

    if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
      setShortenError('URL must start with http:// or https://');
      return;
    }

    if (customAlias.trim() && (customAlias.length < 3 || customAlias.length > 30)) {
      setShortenError('Custom alias must be between 3 and 30 characters.');
      return;
    }

    setIsShortening(true);

    try {
      let expiresAt = null;
      if (useExpiry && expiryValue) {
        const amount = parseInt(expiryValue, 10);
        if (isNaN(amount) || amount <= 0) {
          setShortenError('Please enter a valid expiration duration.');
          setIsShortening(false);
          return;
        }
        const msOffset = expiryUnit === 'hours' ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
        expiresAt = new Date(Date.now() + msOffset).toISOString();
      }

      const response = await api.post('/shorten', {
        originalUrl: originalUrl.trim(),
        customAlias: customAlias.trim() || undefined,
        expiresAt: expiresAt || undefined,
        title: title.trim() || undefined
      });

      if (response.data && response.data.success) {
        setShortenResult(response.data.data);
        setOriginalUrl('');
        setTitle('');
        setCustomAlias('');
        setUseExpiry(false);
        setExpiryValue('');
        // Refresh local URL list to update summaries
        fetchUrls();
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        setShortenError(err.response.data.error);
      } else {
        setShortenError('Failed to shorten URL. Please try again.');
      }
    } finally {
      setIsShortening(false);
    }
  };

  // Copy Short URL Helper
  const handleCopy = async (shortUrl, shortId) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedId(shortId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Delete Short URL
  const handleDelete = async (shortId) => {
    if (!confirm('Are you sure you want to delete this short URL? All analytics history will be lost.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/urls/${shortId}`);
      if (response.data && response.data.success) {
        setUrls(urls.filter(url => url.shortId !== shortId));
        if (selectedShortId === shortId) {
          setAnalyticsData(null);
          setSelectedShortId('');
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete URL.');
    }
  };

  // Trigger Edit Alias / Title
  const startEditingUrl = (url) => {
    setEditingUrl(url);
    setNewAliasValue(url.shortId);
    setNewTitleValue(url.title || '');
    setAliasUpdateError('');
  };

  // Save updates (Alias & Title)
  const handleSaveUrlUpdate = async (e) => {
    e.preventDefault();
    setAliasUpdateError('');

    if (!newAliasValue.trim()) {
      setAliasUpdateError('Alias cannot be empty.');
      return;
    }

    setIsUpdatingAlias(true);

    try {
      const response = await api.patch(`/api/urls/${editingUrl.shortId}/alias`, {
        newAlias: newAliasValue.trim(),
        newTitle: newTitleValue.trim() || undefined
      });

      if (response.data && response.data.success) {
        // Update URL list in state
        setUrls(urls.map(url => {
          if (url.shortId === editingUrl.shortId) {
            return {
              ...url,
              shortId: response.data.data.shortId,
              shortUrl: response.data.data.shortUrl,
              title: newTitleValue.trim() || null
            };
          }
          return url;
        }));
        
        // If updating currently viewed analytics
        if (selectedShortId === editingUrl.shortId) {
          setSelectedShortId(response.data.data.shortId);
        }

        setEditingUrl(null);
      }
    } catch (err) {
      console.error(err);
      setAliasUpdateError(err.response?.data?.error || 'Failed to update URL details.');
    } finally {
      setIsUpdatingAlias(false);
    }
  };

  // Generate QR Code on Canvas
  useEffect(() => {
    if (qrUrl && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 250,
        margin: 2,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR code generation error:', error);
      });
    }
  }, [qrUrl]);

  // Download QR Code PNG
  const downloadQrCode = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr_${qrShortId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export History to CSV
  const exportToCSV = () => {
    if (urls.length === 0) return;
    
    const headers = ['Title', 'Short Link', 'Original Link', 'Created Date', 'Clicks'];
    const rows = urls.map(u => [
      u.title || getFallbackTitle(u.originalUrl),
      u.shortUrl,
      u.originalUrl,
      new Date(u.createdAt).toLocaleString(),
      u.clickCount || 0
    ]);
    
    // Construct CSV Content
    const csvRows = [headers.join(','), ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ziplink_history_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch Analytics for Selected Link
  const fetchAnalytics = async (shortId) => {
    if (!shortId) return;
    setLoadingAnalytics(true);
    setAnalyticsError('');
    try {
      const response = await api.get(`/api/urls/${shortId}/analytics`);
      if (response.data && response.data.success) {
        setAnalyticsData(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setAnalyticsError(err.response?.data?.error || 'Failed to load analytics details.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch analytics automatically
  useEffect(() => {
    if (activeTab === 'analytics' && selectedShortId) {
      fetchAnalytics(selectedShortId);
    }
  }, [selectedShortId, activeTab]);

  // Search filter
  const filteredUrls = urls.filter(url => {
    const query = searchQuery.toLowerCase();
    const titleMatch = (url.title || '').toLowerCase().includes(query);
    const originalMatch = url.originalUrl.toLowerCase().includes(query);
    const aliasMatch = url.shortId.toLowerCase().includes(query);
    return titleMatch || originalMatch || aliasMatch;
  });

  // Sort logic
  const sortedUrls = [...filteredUrls].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'clicks_desc') return (b.clickCount || 0) - (a.clickCount || 0);
    if (sortBy === 'clicks_asc') return (a.clickCount || 0) - (b.clickCount || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Sticky Centered Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 w-full">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-slate-900" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              ZipLink
            </span>
          </div>

          {/* Centered Navigation Tabs */}
          <nav className="flex items-center space-x-1 md:space-x-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shorten</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('analytics');
                if (!selectedShortId && urls.length > 0) {
                  setSelectedShortId(urls[0].shortId);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
          </nav>

          {/* User Account / Logout */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col text-right text-xs">
              <span className="font-semibold text-slate-800 leading-tight">{user.email.split('@')[0]}</span>
              <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Free SaaS Account</span>
            </div>
            <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <button
              onClick={onLogout}
              title="Log Out"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Content Area */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-start">
        
        {/* Render Dashboard (Shorten) Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn w-full">
            
            {/* Quick Stats Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              {/* Total links */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-900">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shortened Links</span>
                  <span className="text-2xl font-black text-slate-900 leading-none mt-1 inline-block">{totalUrls}</span>
                </div>
              </div>

              {/* Total clicks */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-900">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Traffic</span>
                  <span className="text-2xl font-black text-slate-900 leading-none mt-1 inline-block">{totalClicks} clicks</span>
                </div>
              </div>

              {/* Most popular */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-900">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top Performing Link</span>
                  <span className="text-sm font-bold text-slate-900 truncate block mt-0.5" title={topUrl ? `ziplink/${topUrl.shortId}` : 'None'}>
                    {topUrl ? `ziplink/${topUrl.shortId}` : 'None'}
                  </span>
                  {topUrl && <span className="text-[10px] text-slate-450 font-semibold">{topUrl.clickCount || 0} hits recorded</span>}
                </div>
              </div>

            </div>

            {/* Shortener Container */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 w-full max-w-xl space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Shorten a New Link</h2>
                  <p className="text-xs text-slate-500">Generate neat, high-performing links instantly.</p>
                </div>

                {shortenError && (
                  <div className="bg-red-50 border border-red-250 text-red-800 text-xs rounded-lg p-3.5 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-550" />
                    <span>{shortenError}</span>
                  </div>
                )}

                <form onSubmit={handleShorten} className="space-y-4">
                  {/* Destination URL */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                      Destination URL <span className="text-slate-400">*</span>
                    </label>
                    <div className="relative rounded-lg border border-slate-250 bg-white focus-within:border-slate-800 transition-all">
                      <Link2 className="absolute left-3 top-3 text-slate-450 h-4 w-4" />
                      <input
                        type="text"
                        required
                        placeholder="https://example.com/long/campaign/destination/path"
                        value={originalUrl}
                        onChange={(e) => setOriginalUrl(e.target.value)}
                        className="w-full bg-transparent pl-9 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Title / Description */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                        Friendly Title
                      </label>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>
                    </div>
                    <div className="relative rounded-lg border border-slate-250 bg-white focus-within:border-slate-800 transition-all">
                      <input
                        type="text"
                        placeholder="e.g. My Personal Portfolio"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Custom Alias */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                        Custom Alias
                      </label>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>
                    </div>
                    <div className="relative rounded-lg border border-slate-250 bg-white focus-within:border-slate-800 transition-all">
                      <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400 select-none">
                        ziplink/
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. portfolio-2026"
                        value={customAlias}
                        onChange={(e) => setCustomAlias(e.target.value)}
                        className="w-full bg-transparent pl-16 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Link expiry check */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                      <input
                        type="checkbox"
                        checked={useExpiry}
                        onChange={(e) => setUseExpiry(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-350 text-slate-900 focus:ring-0 transition"
                      />
                      <span className="text-xs font-semibold text-slate-650 group-hover:text-slate-900 transition-colors">
                        Configure expiration limit
                      </span>
                    </label>

                    {useExpiry && (
                      <div className="flex gap-3 animate-fadeIn">
                        <div className="w-1/2 relative rounded-lg border border-slate-250 bg-white focus-within:border-slate-800 transition-all">
                          <Clock className="absolute left-3 top-3 text-slate-450 h-3.5 w-3.5" />
                          <input
                            type="number"
                            placeholder="Duration"
                            value={expiryValue}
                            onChange={(e) => setExpiryValue(e.target.value)}
                            className="w-full bg-transparent pl-9 pr-3 py-2.5 text-sm text-slate-700 placeholder-slate-450 focus:outline-none"
                            min="1"
                          />
                        </div>
                        <div className="w-1/2 relative rounded-lg border border-slate-250 bg-white focus-within:border-slate-800 transition-all">
                          <select
                            value={expiryUnit}
                            onChange={(e) => setExpiryUnit(e.target.value)}
                            className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-750 focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                          </select>
                          <span className="absolute right-3.5 top-4.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit link */}
                  <button
                    type="submit"
                    disabled={isShortening}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-65"
                  >
                    {isShortening ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating shortened URL...</span>
                      </>
                    ) : (
                      <span>Shorten URL</span>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Render shorten result */}
            {shortenResult && (
              <div className="flex flex-col items-center">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 w-full max-w-xl space-y-4 animate-fadeIn">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Short Link Created
                  </h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1 rounded-lg border border-emerald-250 bg-white">
                      <input
                        type="text"
                        readOnly
                        value={shortenResult.shortUrl}
                        className="w-full bg-transparent px-3.5 py-2 text-sm text-slate-900 font-medium select-all focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(shortenResult.shortUrl, shortenResult.shortId)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
                        copiedId === shortenResult.shortId
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {copiedId === shortenResult.shortId ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <a
                      href={shortenResult.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {shortenResult.expiresAt && (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Expires: {new Date(shortenResult.expiresAt).toLocaleTimeString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Render History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fadeIn w-full">
            
            {/* Header controls layout */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Link History</h2>
                <p className="text-xs text-slate-500 mt-0.5">Filter, sort, and export your short link diagnostics.</p>
              </div>

              {/* Filters grid */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <div className="relative rounded-lg border border-slate-250 bg-white focus-within:border-slate-800 transition-all w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 text-slate-400 h-3.5 w-3.5" />
                  <input
                    type="text"
                    placeholder="Search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent pl-8.5 pr-3 py-2 text-xs text-slate-700 focus:outline-none"
                  />
                </div>

                {/* Sort Dropdown */}
                <div className="relative rounded-lg border border-slate-250 bg-white transition-all w-32 sm:w-36">
                  <ArrowUpDown className="absolute left-2.5 top-2.5 text-slate-400 h-3.5 w-3.5" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-transparent pl-8 pr-6 py-2 text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="newest">Newest Date</option>
                    <option value="oldest">Oldest Date</option>
                    <option value="clicks_desc">Most Clicks</option>
                    <option value="clicks_asc">Least Clicks</option>
                  </select>
                  <span className="absolute right-2.5 top-3.5 pointer-events-none border-l-3 border-r-3 border-t-3 border-transparent border-t-slate-450" />
                </div>

                {/* CSV Export Button */}
                <button
                  onClick={exportToCSV}
                  disabled={urls.length === 0}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
                  title="Export diagnostics log to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>

            {urlError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{urlError}</span>
              </div>
            )}

            {/* History Table Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {loadingUrls ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-500">Loading directory index...</span>
                </div>
              ) : sortedUrls.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <p className="font-semibold text-slate-650">No short links found</p>
                  <p className="text-[11px] text-slate-450 mt-0.5">
                    {searchQuery ? 'Adjust your filtering query' : 'Create your first short link in the Shorten tab!'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-5 py-3">Link Title / Alias</th>
                        <th className="px-5 py-3">Destination path</th>
                        <th className="px-5 py-3">Date created</th>
                        <th className="px-5 py-3 text-center">Clicks</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {sortedUrls.map(url => (
                        <tr key={url.shortId} className="hover:bg-slate-50/40 transition-colors">
                          {/* Title / Alias */}
                          <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{url.title || getFallbackTitle(url.originalUrl)}</span>
                                <button
                                  onClick={() => startEditingUrl(url)}
                                  title="Edit title & alias details"
                                  className="text-slate-400 hover:text-slate-800 p-0.5 rounded hover:bg-slate-150 transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-[10px] text-blue-600 block">ziplink/{url.shortId}</span>
                            </div>
                          </td>
                          {/* Destination */}
                          <td className="px-5 py-3.5 text-slate-550 max-w-[180px] truncate" title={url.originalUrl}>
                            {url.originalUrl}
                          </td>
                          {/* Date */}
                          <td className="px-5 py-3.5 text-slate-450 whitespace-nowrap">
                            {new Date(url.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          {/* Clicks count */}
                          <td className="px-5 py-3.5 text-center font-bold text-slate-700 whitespace-nowrap text-sm">
                            {url.clickCount || 0}
                          </td>
                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1">
                            {/* Copy button */}
                            <button
                              onClick={() => handleCopy(url.shortUrl, url.shortId)}
                              title="Copy URL"
                              className={`p-1.5 rounded border text-xs font-semibold inline-flex items-center justify-center transition-colors ${
                                copiedId === url.shortId
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                            >
                              {copiedId === url.shortId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* QR button */}
                            <button
                              onClick={() => {
                                setQrUrl(url.shortUrl);
                                setQrShortId(url.shortId);
                              }}
                              title="View QR Code"
                              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors inline-flex items-center justify-center"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {/* Analytics button */}
                            <button
                              onClick={() => {
                                setSelectedShortId(url.shortId);
                                setActiveTab('analytics');
                              }}
                              title="View Analytics"
                              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors inline-flex items-center justify-center"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDelete(url.shortId)}
                              title="Delete Link"
                              className="p-1.5 rounded border border-red-200 bg-white hover:bg-red-50 text-red-650 transition-colors inline-flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Render Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn w-full">
            
            {/* Header / Selector */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Link Diagnostics</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select a shortened URL to review click metadata.</p>
              </div>

              {/* Selection Dropdown */}
              <div className="relative rounded-lg border border-slate-250 bg-white w-full sm:w-60">
                <select
                  value={selectedShortId}
                  onChange={(e) => setSelectedShortId(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="" disabled>Choose short alias...</option>
                  {urls.map(url => (
                    <option key={url.shortId} value={url.shortId}>
                      {url.title || `ziplink/${url.shortId}`}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-3.5 pointer-events-none border-l-3 border-r-3 border-t-3 border-transparent border-t-slate-400" />
              </div>
            </div>

            {/* Error alerts */}
            {analyticsError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{analyticsError}</span>
              </div>
            )}

            {!selectedShortId ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                <p className="font-semibold text-slate-700">No URL Selected</p>
                <p className="text-xs text-slate-450 mt-1">Select a short link from the dropdown above to load data.</p>
              </div>
            ) : loadingAnalytics ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                <span className="text-xs text-slate-500">Aggregating request metadata...</span>
              </div>
            ) : !analyticsData ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                <p className="font-semibold text-slate-700">No Clicks Logged</p>
                <p className="text-xs text-slate-450 mt-1">No hits recorded for this shortened URL yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Traffic Counts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Clicks</span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1">{analyticsData.totalClicks || 0}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique Visitors</span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1">{analyticsData.uniqueClicks || 0}</p>
                  </div>
                </div>

                {/* Progress bars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Countries */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 text-xs uppercase tracking-wider text-slate-500">Location Summary</h3>
                    <div className="space-y-3">
                      {analyticsData.countries?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No countries recorded.</p>
                      ) : (
                        analyticsData.countries.map((c, idx) => {
                          const percentage = analyticsData.totalClicks > 0 ? (c.count / analyticsData.totalClicks) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span>{c.country}</span>
                                <span>{c.count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-slate-800 h-full rounded-full" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Devices */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 text-xs uppercase tracking-wider text-slate-500">Device Types</h3>
                    <div className="space-y-3">
                      {analyticsData.devices?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No devices recorded.</p>
                      ) : (
                        analyticsData.devices.map((d, idx) => {
                          const percentage = analyticsData.totalClicks > 0 ? (d.count / analyticsData.totalClicks) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span>{d.device}</span>
                                <span>{d.count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-slate-800 h-full rounded-full" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Browsers */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 text-xs uppercase tracking-wider text-slate-500">Browsers</h3>
                    <div className="space-y-3">
                      {analyticsData.browsers?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No browsers recorded.</p>
                      ) : (
                        analyticsData.browsers.map((b, idx) => {
                          const percentage = analyticsData.totalClicks > 0 ? (b.count / analyticsData.totalClicks) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span>{b.browser}</span>
                                <span>{b.count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-slate-800 h-full rounded-full" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Referrers */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 text-xs uppercase tracking-wider text-slate-500">Referrer Channels</h3>
                    <div className="space-y-3">
                      {analyticsData.referrers?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No referrer channels recorded.</p>
                      ) : (
                        analyticsData.referrers.map((r, idx) => {
                          const percentage = analyticsData.totalClicks > 0 ? (r.count / analyticsData.totalClicks) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-slate-700 truncate font-mono text-[10px]">
                                <span className="truncate" title={r.referrer}>{r.referrer}</span>
                                <span className="ml-2 shrink-0">{r.count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-slate-800 h-full rounded-full" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Alias & Title Modal */}
      {editingUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Edit Link Details</h3>
              <button
                onClick={() => setEditingUrl(null)}
                className="text-slate-400 hover:text-slate-750 p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aliasUpdateError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{aliasUpdateError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUrlUpdate} className="space-y-3.5">
              {/* Edit Title */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Link Title
                </label>
                <div className="relative rounded-lg border border-slate-250 bg-white focus-within:border-slate-800">
                  <input
                    type="text"
                    value={newTitleValue}
                    onChange={(e) => setNewTitleValue(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm text-slate-700 focus:outline-none"
                    placeholder="e.g. My Website"
                  />
                </div>
              </div>

              {/* Edit Alias */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Custom Alias
                </label>
                <div className="relative rounded-lg border border-slate-250 bg-white focus-within:border-slate-800">
                  <span className="absolute left-3 top-2 text-sm font-semibold text-slate-400 select-none">
                    ziplink/
                  </span>
                  <input
                    type="text"
                    required
                    value={newAliasValue}
                    onChange={(e) => setNewAliasValue(e.target.value)}
                    className="w-full bg-transparent pl-16 pr-4 py-2 text-sm text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUrl(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingAlias}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5"
                >
                  {isUpdatingAlias ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Lightbox */}
      {qrUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-sm w-full p-6 space-y-4 text-center animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">QR Code Diagnostic</h3>
              <button
                onClick={() => {
                  setQrUrl(null);
                  setQrShortId('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center p-4 bg-slate-50 border border-slate-100 rounded-lg">
              <canvas ref={canvasRef} />
            </div>

            <p className="text-[10px] font-semibold text-slate-500 font-mono truncate">{qrUrl}</p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={downloadQrCode}
                className="px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors inline-flex items-center gap-2 w-full justify-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
