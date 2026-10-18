# Scaling Blueprint: SnapShare Photo-Sharing Application

[![Author](https://img.shields.io/badge/Engineer-Jesse%20Vincent-blue.svg)](https://github.com/JDILEMMAX)
[![Module](https://img.shields.io/badge/PLP-Web%20Foundations%20Day%207-red.svg)](https://powerlearnproject.org)
[![Topic](https://img.shields.io/badge/Topic-System%20Design%20--%20Scaling-orange.svg)](#)
[![Scale](https://img.shields.io/badge/Target-1M%20DAU%20at%20Peak-brightgreen.svg)](#)

A production-grade architectural analysis and scaling blueprint for SnapShare, a photo-sharing platform where users upload photos and scroll a feed of photos from followed accounts.

---

## 1. Assumptions and Capacity Planning

### 1.1 Starting Assumptions

| Parameter | Value |
| :--- | :--- |
| Registered users | 10,000,000 |
| Daily active users (DAU): 10% of registered | 1,000,000 |
| Uploads per active user per day | 1 photo |
| Feed views per active user per day | 50 pages |
| Average photo size (original) | 2 MB |
| Thumbnail size per photo | 50 KB |
| Peak traffic multiplier | 5x average |
| Seconds in a day (approximated) | 100,000 |

### 1.2 Write Throughput: Photo Uploads

```
Daily uploads   = 1,000,000 DAU x 1 upload          = 1,000,000 uploads/day
Average uploads = 1,000,000 / 100,000                = 10 uploads/second
Peak uploads    = 10 x 5                             = 50 uploads/second
```

### 1.3 Read Throughput: Feed Views

```
Daily feed views   = 1,000,000 DAU x 50 views        = 50,000,000 views/day
Average feed reads = 50,000,000 / 100,000             = 500 reads/second
Peak feed reads    = 500 x 5                          = 2,500 reads/second
```

### 1.4 Storage Growth: Annual

```
New original photos per day  = 1,000,000 x 2 MB      = 2,000,000 MB  = 2 TB/day
New thumbnails per day       = 1,000,000 x 50 KB      = 50,000,000 KB = ~50 GB/day
Combined raw storage per day                          = ~2.05 TB/day
Annual storage growth        = 2.05 TB x 365          = ~748 TB (~0.75 PB) per year
```

### 1.5 Read-Heavy vs Write-Heavy Classification

**SnapShare is strongly read-heavy.** The ratio of reads to writes is 50:1 (500 reads/s vs 10 writes/s at average load). This ratio dictates two core architectural decisions:

1. **Caching is the primary performance lever.** The vast majority of traffic consists of repeated feed reads, making an in-memory cache (Redis) the most impactful single optimization. Serving feed data from cache eliminates 80-90% of database read load.
2. **Read replicas are essential.** The primary database must be protected from the 500+ reads/second volume. Routing all reads to dedicated read replicas allows the primary to focus solely on writes, preserving write throughput and replication stability.

---

## 2. Storage Separation Analysis: Why Photos Must Not Live in the Database

Storing binary photo data as BLOBs inside a relational database is a critical architectural anti-pattern for the following technical reasons:

### 2.1 Row Size and B-Tree Degradation
Relational databases such as PostgreSQL and MySQL use B-tree index structures optimized for fixed-width or compact variable-length row data. A 2 MB BLOB embedded in a row causes index pages to balloon, degrading B-tree traversal from O(log N) to near-O(N) as pages overflow and require additional disk seeks. A query scanning 1,000 photo rows reads 2 GB of raw binary data from disk rather than a set of compact metadata pointers.

### 2.2 Backup and Replication Overhead
Database replication (primary to replicas) transfers row-level change events through a binary log (binlog/WAL). Including 2 MB photo payloads in replication streams multiplies network bandwidth consumption by orders of magnitude, introducing replication lag and threatening eventual-consistency windows for feed metadata.

### 2.3 Connection Pool Exhaustion
Web server database connections are pooled in limited quantities (typically 20-100 per application server). Streaming a 2 MB BLOB over a database connection holds that connection open for the entire transfer duration, starving other concurrent queries of connection slots and causing cascading latency spikes under peak load.

### 2.4 Correct Approach: Object Storage with Metadata References
Binary image files belong in a distributed object storage system (such as AWS S3, Google Cloud Storage or Azure Blob Storage). The relational database stores only a lightweight metadata record per photo:

```sql
CREATE TABLE photos (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    storage_key TEXT NOT NULL,          -- e.g. "photos/2024/01/abc123.jpg"
    thumb_key   TEXT,                   -- e.g. "thumbs/2024/01/abc123_thumb.jpg"
    caption     TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
```

Object storage delivers binary content over HTTP with parallel streaming, automatic geo-replication and per-object CDN cache integration. The database row remains compact (under 1 KB), preserving index efficiency and replication throughput.

---

## 3. End-to-End System Architecture

```text
                          ┌──────────────────────────────┐
                          │   Client Devices              │
                          │   (browsers, iOS, Android)    │
                          └───────────┬──────────────────┘
                                      │
                          ┌───────────▼──────────────────┐
                          │   DNS (e.g. Route 53)         │
                          │   snapshare.io → LB IP        │
                          └───────────┬──────────────────┘
                                      │
              ┌───────────────────────▼───────────────────────┐
              │   Global CDN (e.g. CloudFront / Cloudflare)   │
              │   - Serves thumbnails and static assets        │
              │   - Edge caches photo objects near users       │
              └───────────────────────┬───────────────────────┘
                                      │ Cache miss: API calls
                          ┌───────────▼──────────────────┐
                          │   Load Balancer               │
                          │   (Nginx / AWS ALB)           │
                          └──┬──────────┬──────────┬─────┘
                             │          │          │
                   ┌─────────▼─┐  ┌─────▼─────┐  ┌▼──────────┐
                   │ App Srv 1  │  │ App Srv 2  │  │ App Srv 3  │
                   │ (stateless)│  │ (stateless)│  │ (stateless)│
                   └─────┬─────┘  └─────┬─────┘  └─────┬──────┘
                         │              │               │
              ┌───────────▼──────────────────────────────▼──────┐
              │          In-Memory Cache (Redis)                  │
              │   - Feed page sets, user session tokens           │
              │   - TTL: 30-60 seconds for feeds                  │
              └──────────────────────────────────────────────────┘
                         │ write             │ read
               ┌─────────▼────┐       ┌──────▼──────────────────┐
               │  Primary DB   │─copy─▶│  Read Replica 1         │
               │  (PostgreSQL) │       │  Read Replica 2         │
               │  metadata +   │       │  (handles all SELECTs)  │
               │  user records │       └──────────────────────────┘
               └──────────────┘
                         │ presigned URLs
               ┌─────────▼──────────────────────────────────────┐
               │        Object Storage (AWS S3)                  │
               │   - Original photos (2 MB each)                 │
               │   - Thumbnails (50 KB each)                     │
               │   - Versioned, geo-replicated                   │
               └──────────────────────────────────────────────────┘
                         │ job dispatch
               ┌─────────▼──────────────────────────────────────┐
               │  Async Message Queue (e.g. Amazon SQS)          │
               │   - "generate-thumbnail" job per upload         │
               └───────────────────┬────────────────────────────┘
                                   │ consume
                         ┌─────────▼─────────┐
                         │   Worker Fleet     │
                         │   - Reads original │
                         │   - Resizes image  │
                         │   - Writes thumb   │
                         │     to S3          │
                         └────────────────────┘
```

---

## 4. Component Responsibilities

| Component | Problem It Solves |
| :--- | :--- |
| **Client Devices** | Generate all user-initiated HTTP requests: feed reads, photo uploads and profile interactions. |
| **DNS** | Resolves `snapshare.io` to the load balancer's IP address, routing users to the entry point of the system. |
| **Global CDN** | Caches thumbnails and static assets at edge servers near users worldwide, cutting image delivery latency from hundreds of milliseconds to under 40 ms. |
| **Load Balancer** | Distributes incoming API requests across the application server fleet and health-checks servers, automatically withdrawing traffic from unhealthy instances. |
| **Stateless App Servers** | Execute all business logic (authentication, authorization, feed assembly, upload coordination) without storing user state locally, enabling any server to handle any request. |
| **In-Memory Cache (Redis)** | Serves pre-assembled feed data and session tokens from RAM at sub-millisecond latency, absorbing the majority of read traffic before it reaches the database. |
| **Primary Database** | Accepts all write operations - new user records, photo metadata inserts and feed-graph relationship updates - as the single authoritative source of truth. |
| **Read Replicas** | Handle the 50:1 volume of read queries (feed fetches, profile lookups) by serving data copied from the primary, protecting write throughput on the primary. |
| **Object Storage (S3)** | Stores all binary photo files (originals and thumbnails) outside the database, delivering them over HTTP at scale without consuming database connections or replication bandwidth. |
| **Async Message Queue** | Decouples slow post-upload processing (thumbnail generation) from the user-facing upload response, allowing the API to confirm success immediately while background work proceeds independently. |
| **Worker Fleet** | Consumes thumbnail-generation jobs from the queue, performs image resizing using CPU-bound libraries and writes finished thumbnails back to object storage without impacting the latency of web-facing servers. |

---

## 5. Step-by-Step Upload Lifecycle

The following traces a single photo upload from the client device through every layer of the system.

**Step 1: Authentication**
The client sends a request to `POST /api/v1/photos/upload-url` with a JWT bearer token in the `Authorization` header. The app server validates the JWT signature, confirms expiry and extracts the `user_id` claim. Unauthorized tokens receive `401 Unauthorized` immediately.

**Step 2: Presigned URL Generation**
The authenticated app server calls the AWS S3 SDK to generate a presigned `PUT` URL scoped to a unique object key (e.g. `photos/2024/01/{uuid}.jpg`) with a 15-minute expiry. The server responds with the presigned URL and the new photo's provisional `id`.

```json
{
  "photo_id": 98234,
  "upload_url": "https://snapshare-bucket.s3.amazonaws.com/photos/2024/01/abc123.jpg?X-Amz-Signature=...",
  "expires_in": 900
}
```

**Step 3: Direct-to-S3 Upload**
The client sends a binary `PUT` request directly to the presigned S3 URL. The photo payload never transits the app servers, eliminating memory pressure and connection pool exhaustion during large binary transfers.

**Step 4: Metadata Persistence**
Upon successful client-to-S3 upload, the client notifies the app server via `POST /api/v1/photos/{photo_id}/confirm`. The app server inserts the photo metadata row (storage key, caption, timestamp and user association) into the primary database inside a transaction. The server responds with `201 Created`.

**Step 5: Cache Invalidation**
The app server deletes the requesting user's cached feed key from Redis (e.g. `DEL feed:user:{user_id}`) so that the next feed load reflects the new upload rather than a stale pre-upload snapshot.

**Step 6: Queue Dispatch**
The app server publishes a `generate-thumbnail` message to the message queue containing the `photo_id` and the S3 object key of the original image.

```json
{
  "job": "generate-thumbnail",
  "photo_id": 98234,
  "source_key": "photos/2024/01/abc123.jpg"
}
```

**Step 7: Background Thumbnail Generation**
A worker process dequeues the job, fetches the original image from S3, resizes it to the thumbnail dimensions (e.g. 300x300 px) then writes the compressed thumbnail back to S3 under the `thumbs/` prefix. The worker then updates the `thumb_key` column on the photo metadata row in the primary database.

**Step 8: Final Status Broadcast**
Upon thumbnail completion, the worker updates the photo record status to `ready`. Clients polling for photo status (or receiving a push notification via WebSocket) see the photo transition to fully available in the feed.

---

## 6. Architectural Trade-Off Analysis

### 6.1 Cache Freshness vs Read Latency

**Trade-off:** Redis feed caches dramatically reduce read latency (from ~20 ms database queries to ~1 ms cache hits) but introduce a staleness window governed by the TTL. If a followed user uploads a new photo, followers' cached feeds will not reflect it until the TTL expires or the cache key is explicitly invalidated.

**Mitigation:** For a photo-sharing feed, a staleness window of 30-60 seconds is entirely acceptable. Users do not expect real-time photo arrival to the millisecond. Explicit cache invalidation on the uploader's followers' feed keys is possible but expensive at scale (a user with 1M followers would require 1M cache deletes per upload). Fan-out-on-write is reserved for smaller account scales; fan-out-on-read (assembling the feed on demand, then caching the result per user) is the practical choice for large follower graphs.

**SPOF Mitigation:** Redis is deployed in a clustered or sentinel configuration with automatic failover. A Redis outage degrades to cold cache reads against the database replicas; service continues with higher latency rather than complete downtime.

### 6.2 Pre-generated Feeds vs Fan-out-on-Read

**Trade-off:** Pre-generating and caching personalized feeds for every active user (fan-out-on-write) ensures near-instant feed response at read time. However, when a celebrity account with 10M followers posts a photo, the system must fan out 10M cache write operations simultaneously, creating a write amplification spike that can overload the cache cluster and the database.

**Mitigation:** A hybrid strategy separates accounts by follower count. Regular accounts (under 10,000 followers) use fan-out-on-write for low-latency feeds. High-follower celebrity accounts use fan-out-on-read: the feed is assembled at request time by merging the celebrity's recent posts with the follower's cached personal feed. This caps the worst-case write amplification while preserving fast reads for the typical user.

### 6.3 Storage Cost vs Compute in Thumbnail Generation

**Trade-off:** Pre-generating thumbnails at upload time (the current architecture) consumes worker compute and storage space for every uploaded photo. Alternatively, thumbnails could be generated on-demand by a CDN image transformation service at first view, eliminating pre-generation cost for photos that are never actually viewed.

**Mitigation:** On a feed-heavy platform where most photos are actively viewed, pre-generation is more cost-effective than on-demand generation at CDN edge. However, for archived or rarely-viewed photos, on-demand generation with a long CDN cache TTL reduces unnecessary storage overhead. A tiered strategy - pre-generate for recent uploads, on-demand for photos older than 90 days - balances compute cost against storage cost.

### 6.4 Single Point of Failure (SPOF) Mitigation Summary

| Component | SPOF Risk | Mitigation |
| :--- | :--- | :--- |
| **Load Balancer** | All traffic blocked if the balancer fails | Deploy redundant load balancers with active-passive failover or use a cloud-managed load balancer with built-in HA |
| **Primary Database** | All writes blocked if the primary fails | Automatic failover promotes a replica to primary within 30-60 seconds (PostgreSQL streaming replication with Patroni or AWS RDS Multi-AZ) |
| **Redis Cache** | Cache miss storm hits database replicas | Redis Sentinel or Redis Cluster with automatic leader election; replicas absorb the read storm during failover |
| **Object Storage** | Photo delivery fails if S3 has an outage | S3 provides 99.999999999% (eleven nines) durability with automatic cross-AZ replication; CDN edge caches absorb active content during short outages |
| **Message Queue** | Thumbnail jobs lost if queue fails | SQS provides durable message persistence with at-least-once delivery; worker fleet retries failed jobs with exponential backoff |
| **Single App Server** | Requests in-flight are dropped | Stateless design means the load balancer's health check detects the failure within seconds and reroutes traffic to healthy servers; clients retry transparently |
