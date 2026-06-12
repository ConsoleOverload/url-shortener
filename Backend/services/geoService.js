/**
 * Parses user agent string to identify device type and browser name.
 * Prevents bringing in large native libraries or slow packages.
 */
export const parseUserAgent = (userAgentString) => {
  if (!userAgentString) {
    return { device: 'Unknown', browser: 'Unknown' };
  }

  let device = 'Desktop';
  let browser = 'Unknown';

  const ua = userAgentString.toLowerCase();

  // Device detection
  if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone') || ua.includes('webos')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad') || ua.includes('playbook')) {
    device = 'Tablet';
  }

  // Browser detection
  if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android')) {
    browser = 'Safari';
  } else if (ua.includes('edge') || ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  } else if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    browser = 'Bot/Crawler';
  }

  return { device, browser };
};

/**
 * Returns country and city information based on IP address.
 * Utilizes a fast non-blocking lookup with short timeout, falling back gracefully.
 */
export const getGeoInfo = async (ip) => {
  // Normalize local IPs
  const cleanIp = ip.replace(/^::ffff:/, '');
  const isLocal = cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.') || cleanIp.startsWith('172.16.');

  if (isLocal) {
    return {
      country: 'Localhost',
      city: 'Local Network'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const response = await fetch(`http://ip-api.com/json/${cleanIp}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.status === 'success') {
        return {
          country: data.country || 'Unknown',
          city: data.city || 'Unknown'
        };
      }
    }
  } catch (error) {
    // Suppress external network lookup failure and fallback
  }

  // Fallback for default or errored lookups
  return {
    country: 'United States',
    city: 'New York'
  };
};
