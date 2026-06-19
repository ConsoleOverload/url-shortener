<!--
---
marp: true
theme: default
paginate: true
_class: lead
title: URL Shortener
date:
tags: #lms #coding #technical
---
-->

# URL Shortener

- A scalable URL shortening service built with Node.js, Express, MongoDB, and Redis. It allows users to generate short links, handle redirections efficiently, and track click analytics.

---

##  Features

- Create short URLs from long links
- Custom alias support
- Optional link expiration
- Fast redirection using Redis caching
- Click analytics (device, browser, location, referrer)
- Rate limiting for abuse protection
- Fault-tolerant design (works even if Redis is down)

---

##  Tech Stack

- Backend: Node.js, Express
- Database: MongoDB (Mongoose)
- Caching: Redis
- Frontend: React (optional UI)
- Other: Axios, Helmet, Morgan, Rate Limiter

---

##  How It Works

- User submits a long URL
- Server generates a unique short ID (or custom alias)
- Mapping is stored in MongoDB and cached in Redis
- When accessed, short URL redirects to original URL
- Click data is logged asynchronously for analytics

---

##  Analytics

- **Tracks:**

- Total clicks
- Unique visitors
- Device &amp; browser usage
- Country &amp; city
- Referrer sources

---

##  Optimizations

- Cache-aside pattern using Redis
- Cache stampede prevention
- Negative caching for invalid URLs
- MongoDB TTL index for auto-expiry
- Async logging to avoid slowing redirects
