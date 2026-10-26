# TicketHub Distributed Event Ticketing System Design

[![Author](https://img.shields.io/badge/Engineer-Jesse%20Vincent-blue.svg)](https://github.com/JDILEMMAX)
[![Module](https://img.shields.io/badge/PLP-Web%20Foundations%20%26%20System%20Design-red.svg)](https://powerlearnproject.org)
[![Day](https://img.shields.io/badge/Milestone-Day%208%20Capstone-orange.svg)](#)
[![Standard](https://img.shields.io/badge/Standard-RESTful%20%2F%203NF%20%2F%20ACID-brightgreen.svg)](#)

---

## 1. System Context & Requirements

TicketHub is a high-throughput digital ticketing platform engineered to manage reserved-seating event discovery, real-time interactive venue mapping, temporary seat reservation locks, transactional checkout and cryptographic digital ticket delivery. The primary engineering challenge lies in reconciling massive, asymmetric read and write surges during high-demand concert flash sales while guaranteeing zero seat double-bookings under strict ACID transactional semantics.

```text
+-----------------------------------------------------------------------------------+
|                             TICKETHUB CORE LIFECYCLE                              |
|                                                                                   |
|  [Browse Events] -> [Interactive Seat Map] -> [10-Min Temporary Hold Lock]        |
|                                                      |                            |
|                                          +-----------+-----------+                |
|                                          |                       |                |
|                                    [Checkout Paid]       [Hold Expires / 600s]    |
|                                          |                       |                |
|                             [Cryptographic Ticket]      [Returned to Inventory]   |
+-----------------------------------------------------------------------------------+
```

### 1.1 Functional Requirements

1. **Event Discovery and Catalog Search:** Users can browse, search and filter published events across categories, venues, dates and performance headliners.
2. **Interactive Venue Seat Inventory:** Users can inspect real-time seat status (`AVAILABLE`, `HELD`, `BOOKED`) across sections, rows and individual seat coordinates.
3. **Temporary Seat Hold Acquisition:** Users can acquire a temporary, exclusive 10-minute (600-second) hold on up to four selected seats.
4. **Transactional Order Checkout:** Users can convert active seat holds into confirmed ticket orders by submitting payment details within the active hold window.
5. **Cryptographic Ticket Issuance:** Confirmed orders generate immutable digital ticket records containing signed QR codes, seat assignments and verification hashes.

### 1.2 Non-Functional Requirements

1. **Strict Transactional Correctness (Zero Double-Bookings):** The platform must maintain strict serializability for seat reservations. Under no circumstances may two concurrent purchasers be granted holds or finalized tickets for the identical seat.
2. **High Availability (99.99% SLO):** Unplanned system downtime must not exceed 52.6 minutes per calendar year. Browse and inventory read paths must remain accessible even if backend payment processing degrades.
3. **Ultra-Low Latency Seat Map Reads (<100 ms P95):** Interactive seat availability matrices must render in less than 100 milliseconds for 95% of requests to preserve responsive user experiences.
4. **Fairness and Flash-Crowd Surge Protection:** The platform must absorb traffic spikes of up to 4,000x baseline without cascading connection pool collapse, server degradation or database starvation.
5. **Auditability and Financial Integrity:** Every seat state transition, lock grant, hold expiration and payment event must be written to an immutable audit trail for forensic settlement.

---

## 2. Capacity Estimates & Flash-Crowd Surges

System load diverges sharply between baseline operational hours and high-demand flash sales. The architecture must be sized to operate cost-effectively during normal traffic while maintaining adequate headroom and elasticity for severe flash-crowd contention.

### 2.1 Baseline Operational Traffic

Baseline metrics represent regular day-to-day engagement across published events:

* **Registered User Base:** 2,000,000 accounts.
* **Daily Active Visitors (DAU):** 50,000 users.
* **Page Views per Visitor:** 10 page views per session.
* **Total Daily Page Views:** $50,000 \times 10 = 500,000$ read operations/day.
* **Effective Daily Operational Seconds:** $\approx 100,000\text{ seconds}$ ($86,400\text{ s}$ rounded up for conservative headroom).
* **Average Read Throughput:** $\frac{500,000}{100,000} = 5\text{ reads/second}$.
* **Peak Baseline Read Throughput (3x multiplier):** $5 \times 3 = 15\text{ reads/second}$.
* **Daily Ticket Volume:** 5,000 tickets sold/day.
* **Average Write Throughput:** $\frac{5,000}{100,000} = 0.05\text{ checkout writes/second}$.
* **Peak Baseline Write Throughput (3x multiplier):** $0.05 \times 3 = 0.15\text{ writes/second}$.

### 2.2 Flash-Sale Surge Modeling

A marquee stadium concert goes on sale at 10:00:00 AM. 200,000 concurrent prospective buyers converge to compete for 20,000 available seats within an initial 10-minute window ($600\text{ seconds}$).

```text
Flash-Sale Surge Envelope (10 Minutes / 600 Seconds):
- Concurrent Competing Users: 200,000
- Available Inventory: 20,000 seats
- Over-subscription Ratio: 10 prospective buyers per available seat
```

* **Flash-Sale Read Queries:**
  * 200,000 concurrent users poll seat availability every 10 to 20 seconds.
  * Average seat map query frequency: 1 query every 15 seconds per user.
  * Sustained Read Throughput: $\frac{200,000\text{ users}}{15\text{ seconds}} \approx 13,333\text{ reads/second}$.
  * Peak Burst Read Throughput (opening 60 seconds): Up to $20,000\text{ reads/second}$.

* **Flash-Sale Write Operations (Seat Holds and Checkouts):**
  * 200,000 users attempt to hold seats in the opening 120 seconds.
  * Initial Hold Attempt Rate: $\frac{200,000}{120} \approx 1,666\text{ lock attempts/second}$.
  * Successful Seat Holds: 20,000 seats acquired over 600 seconds.
  * Successful Checkout Writes: $\frac{20,000\text{ orders}}{600\text{ seconds}} \approx 33.3\text{ final writes/second}$.
  * Peak Checkout Write Rate (concentrated checkout completion burst): $333\text{ to }1,000\text{ writes/second}$ during peak payment settlement.

### 2.3 Traffic Comparison and Scaling Multipliers

| Metric Category | Baseline Average | Flash-Sale Peak | Surge Multiplier | Primary Architectural Countermeasure |
| :--- | :--- | :--- | :--- | :--- |
| **Read Volume** | 5 reads/s | 20,000 reads/s | **4,000x** | Edge CDN + Redis seat-map cache clusters |
| **Lock Attempt Volume** | 0.1 requests/s | 1,666 requests/s | **16,660x** | In-Memory Redis distributed lock (`SETNX`) |
| **Checkout Write Volume** | 0.05 writes/s | 1,000 writes/s | **20,000x** | Virtual waiting room + partitioned SQL pool |
| **Storage per Event** | Negligible | ~24 MB metadata | Baseline scale | Relational database schema with 3NF indexes |

---

## 3. RESTful API Contract Specification

The TicketHub API adheres strictly to REST principles, using standard HTTP semantics, consistent JSON serialization and explicit RFC 7807 problem details for all error conditions.

```text
+-----------------------+---------+----------------------------------------------+
| METHOD & PATH         | SUCCESS | PRIMARY RESPONSIBILITY                       |
+-----------------------+---------+----------------------------------------------+
| GET  /events          | 200 OK  | Paginated event discovery with filters       |
| GET  /events/{id}/seat| 200 OK  | Seat inventory grid and state matrix         |
| POST /seats/hold      | 201 Cre | Temporary 10-minute reservation lock         |
| POST /orders/checkout | 201 Cre | Transactional payment and order confirmation |
| GET  /users/{id}/tick | 200 OK  | Cryptographic digital ticket pass retrieval  |
+-----------------------+---------+----------------------------------------------+
```

### 3.1 Endpoint 1: Event Discovery Catalog

* **Route:** `GET /events`
* **Query Parameters:** `category` (string, optional), `city` (string, optional), `page` (integer, default 1), `limit` (integer, default 20).
* **Success Response (`200 OK`):**

```json
{
  "page": 1,
  "limit": 20,
  "total": 142,
  "events": [
    {
      "id": "evt_99812",
      "title": "Acoustic Nights Live",
      "venue": "Nairobi Arena",
      "start_time": "2026-11-15T18:00:00Z",
      "total_seats": 20000,
      "available_seats": 14280,
      "min_price_cents": 3500
    }
  ]
}
```

### 3.2 Endpoint 2: Seat Map and Inventory Availability

* **Route:** `GET /events/{id}/seats`
* **Path Parameter:** `id` (e.g. `evt_99812`).
* **Success Response (`200 OK`):**

```json
{
  "event_id": "evt_99812",
  "generated_at": "2026-10-26T08:00:00Z",
  "sections": [
    {
      "section": "VIP-A",
      "seats": [
        { "id": 101, "row": "A", "number": 1, "status": "AVAILABLE", "price_cents": 12000 },
        { "id": 102, "row": "A", "number": 2, "status": "HELD", "price_cents": 12000 },
        { "id": 103, "row": "A", "number": 3, "status": "BOOKED", "price_cents": 12000 }
      ]
    }
  ]
}
```

### 3.3 Endpoint 3: Temporary Seat Hold Acquisition

* **Route:** `POST /seats/hold`
* **Headers:** `Content-Type: application/json`, `Idempotency-Key: <UUID>`
* **Request Payload:**

```json
{
  "event_id": "evt_99812",
  "user_id": 48210,
  "seat_ids": [101, 102]
}
```

* **Success Response (`201 Created`):**

```json
{
  "hold_token": "hld_4a9f81bc2",
  "event_id": "evt_99812",
  "seat_ids": [101, 102],
  "held_at": "2026-10-26T08:02:15Z",
  "expires_at": "2026-10-26T08:12:15Z",
  "ttl_seconds": 600,
  "total_price_cents": 24000
}
```

* **Conflict Error Response (`409 Conflict`):**

```json
{
  "type": "https://api.tickethub.io/errors/seat-unavailable",
  "title": "Seat Reservation Conflict",
  "status": 409,
  "detail": "Seat #102 is currently held by another customer.",
  "instance": "/seats/hold",
  "unavailable_seat_ids": [102]
}
```

### 3.4 Endpoint 4: Transactional Order Checkout

* **Route:** `POST /orders/checkout`
* **Headers:** `Content-Type: application/json`, `Idempotency-Key: <UUID>`
* **Request Payload:**

```json
{
  "hold_token": "hld_4a9f81bc2",
  "user_id": 48210,
  "payment_nonce": "pm_tok_991823ab",
  "billing_email": "buyer@domain.com"
}
```

* **Success Response (`201 Created`):**

```json
{
  "order_id": "ord_8812739",
  "user_id": 48210,
  "status": "CONFIRMED",
  "total_amount_cents": 24000,
  "currency": "KES",
  "ticket_count": 2,
  "confirmed_at": "2026-10-26T08:05:42Z"
}
```

### 3.5 Endpoint 5: Digital Ticket Retrieval

* **Route:** `GET /users/{id}/tickets`
* **Success Response (`200 OK`):**

```json
{
  "user_id": 48210,
  "tickets": [
    {
      "ticket_id": "tkt_00129",
      "order_id": "ord_8812739",
      "event_title": "Acoustic Nights Live",
      "section": "VIP-A",
      "row": "A",
      "seat_number": 1,
      "qr_signature": "sha256:88adfa9921bc4e",
      "verification_url": "https://tickethub.io/verify/tkt_00129"
    }
  ]
}
```

### 3.6 Standard Error Contract Summary

| HTTP Code | Error Name | Trigger Condition |
| :--- | :--- | :--- |
| **`400 Bad Request`** | `invalid-payload` | Malformed JSON, seat limit exceeded (>4 seats) or missing fields |
| **`404 Not Found`** | `resource-not-found` | Event ID, seat ID or user ID does not exist |
| **`409 Conflict`** | `seat-unavailable` | One or more requested seats are already HELD or BOOKED |
| **`429 Too Many Requests`** | `rate-limit-exceeded` | Client exceeded flash-sale queue rate threshold |
| **`500 Internal Error`** | `server-fault` | Unhandled database or gateway failure |

---

## 4. Relational Data Model (3NF Schema)

The database schema is organized in Third Normal Form (3NF). Every non-key column is strictly dependent on the primary key, the whole primary key and nothing but the primary key.

```text
+---------------+       1:N       +---------------+
|     USERS     | <-------------- |    ORDERS     |
+---------------+                 +---------------+
| id (PK)       |                        | 1
| email (UQ)    |                        |
| full_name     |                        | 1:N
| password_hash |                        v
+---------------+                 +---------------+
                                  |  ORDER_ITEMS  |
                                  +---------------+
                                  | id (PK)       |
+---------------+       1:N       | order_id (FK) |
|    EVENTS     | <-------------- | seat_id (FK)  |
+---------------+                 +---------------+
| id (PK)       |                        |
| title         |                        | 1:1
| venue_name    |                        v
| start_time    |                 +---------------+
+---------------+ <-------------- |     SEATS     |
                        1:N       +---------------+
                                  | id (PK)       |
                                  | event_id (FK) |
                                  | status        |
                                  | held_by (FK)  |
                                  | lock_token    |
                                  | expires_at    |
                                  +---------------+
```

### 4.1 Production ANSI SQL DDL

```sql
-- 1. Users Table
CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Events Table
CREATE TABLE events (
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    venue_name VARCHAR(150) NOT NULL,
    venue_city VARCHAR(100) NOT NULL,
    total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
    sales_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    event_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Seats Table
CREATE TABLE seats (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    event_id VARCHAR(32) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    section_code VARCHAR(20) NOT NULL,
    row_label VARCHAR(10) NOT NULL,
    seat_number INTEGER NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    held_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    hold_token VARCHAR(64),
    hold_expires_at TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_seat_status CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED')),
    CONSTRAINT uq_event_seat_location UNIQUE (event_id, section_code, row_label, seat_number)
);

-- 4. Orders Table
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_id VARCHAR(32) NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_order_status CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'))
);

-- 5. Order Items Table
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seat_id BIGINT NOT NULL UNIQUE REFERENCES seats(id) ON DELETE RESTRICT,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
    qr_signature VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 4.2 Indexing Strategy & Performance Justifications

```sql
-- Accelerated event seat map rendering (covers event inventory by status)
CREATE INDEX idx_seats_event_status ON seats(event_id, status);

-- Rapid hold expiration sweeps to reclaim abandoned seats
CREATE INDEX idx_seats_hold_expiry ON seats(status, hold_expires_at) 
WHERE status = 'HELD';

-- Order lookups by user for ticket retrieval
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
```

* **`idx_seats_event_status`:** Optimizes `GET /events/{id}/seats` queries. Instead of an expensive table scan across millions of seats, the engine executes an index range scan in $O(\log N)$ time.
* **`idx_seats_hold_expiry`:** A partial index containing only active holds. Background reconciliation jobs query expired holds in milliseconds without inspecting millions of available or booked records.

### 4.3 Seat State Transitions

```text
                [INITIAL SEED]
                      |
                      v
             +-----------------+
             |    AVAILABLE    | <--------------------+
             +-----------------+                      |
                      |                               |
              [Hold Acquired]               [Hold Expired / 600s]
                      v                               |
             +-----------------+                      |
             |      HELD       | ---------------------+
             +-----------------+
                      |
              [Checkout Success]
                      v
             +-----------------+
             |     BOOKED      | (Terminal State)
             +-----------------+
```

---

## 5. Double-Booking Prevention Engine

The core technical imperative of TicketHub is guaranteeing that under no circumstances can two concurrent buyers claim the same seat. This is resolved through a synchronized two-tier lock pipeline combining sub-millisecond in-memory distributed locks with atomic relational database updates.

```text
+-----------------------------------------------------------------------------------+
|                        TWO-TIER SEAT RESERVATION PIPELINE                         |
|                                                                                   |
|  Client Request: POST /seats/hold { seat_id: 102, user_id: 48210 }                |
|                               |                                                   |
|                               v                                                   |
|  [TIER 1: REDIS DISTRIBUTED LOCK]                                                 |
|  Command: SET lock:seat:102 user_48210 NX EX 600                                  |
|          |                                                                        |
|          +---> If Key Exists (Lock Denied)  --> Return 409 Conflict immediately   |
|          |                                      (DB never touched)                |
|          +---> If Key Set (Lock Granted)    --> Proceed to Tier 2                 |
|                                                                                   |
|                               v                                                   |
|  [TIER 2: RELATIONAL ACID TRANSACTION]                                            |
|  BEGIN TRANSACTION;                                                               |
|  UPDATE seats                                                                     |
|  SET status = 'HELD', held_by_user_id = 48210,                                    |
|      hold_token = 'hld_xyz', hold_expires_at = NOW() + INTERVAL '600 SECONDS'     |
|  WHERE id = 102 AND status = 'AVAILABLE';                                         |
|          |                                                                        |
|          +---> If Rows Affected == 1 --> COMMIT; Return 201 Created               |
|          +---> If Rows Affected == 0 --> ROLLBACK; Del Redis Key; Return 409      |
+-----------------------------------------------------------------------------------+
```

### 5.1 Tier 1: In-Memory Distributed Lock (Redis Layer)

Before executing any database statement, the application server requests an atomic lock from the Redis cluster:

```text
Command: SET lock:seat:{event_id}:{seat_id} {user_id}:{hold_token} NX EX 600
```

* **`NX` (Not Exists):** Guarantees atomicity. If 500 requests hit the cluster for seat #102 simultaneously, exactly one execution succeeds in writing the key. All 499 competing requests evaluate to `nil` and return an immediate `409 Conflict` to the client in less than 2 milliseconds.
* **`EX 600`:** Sets a hard 10-minute time-to-live (TTL). If an application server crashes immediately after granting a hold, the lock automatically expires without requiring manual intervention.

### 5.2 Tier 2: Relational ACID Transaction (Database Layer)

Once the Redis lock is acquired, the application commits the hold to the relational database inside an explicit transaction:

```sql
BEGIN TRANSACTION;

UPDATE seats
SET 
    status = 'HELD',
    held_by_user_id = :user_id,
    hold_token = :hold_token,
    hold_expires_at = CURRENT_TIMESTAMP + INTERVAL '600 seconds',
    version = version + 1
WHERE 
    id = :seat_id 
    AND status = 'AVAILABLE';

-- Check affected rows in application layer:
-- If affected_rows == 1:
COMMIT;
-- If affected_rows == 0:
ROLLBACK;
```

* **Conditional Where Clause (`status = 'AVAILABLE'`):** Even if an unforeseen race condition bypassed Redis, the database row-level lock enforces serial consistency. If the row status is not `AVAILABLE`, zero rows are modified, triggering an immediate transaction rollback.

### 5.3 Automated Hold Expiration and Reconciliation

To ensure seats held by users who abandon checkout are returned to inventory, two complementary mechanisms operate in parallel:

1. **Passive Lazy Expiration:** When `GET /events/{id}/seats` queries inventory, any seat marked `HELD` whose `hold_expires_at < CURRENT_TIMESTAMP` is treated as `AVAILABLE` in the response payload.
2. **Active Asynchronous Sweeper:** An asynchronous worker daemon polls every 10 seconds using the partial index:
   ```sql
   UPDATE seats
   SET 
       status = 'AVAILABLE',
       held_by_user_id = NULL,
       hold_token = NULL,
       hold_expires_at = NULL,
       version = version + 1
   WHERE 
       status = 'HELD' 
       AND hold_expires_at < CURRENT_TIMESTAMP;
   ```

---

## 6. High-Level Distributed Architecture

The system is structured as a decoupled, multi-tier distributed topology engineered to shield internal databases from direct exposure to flash-crowd concurrency.

```text
+-------------------------------------------------------------------------------------------+
|                          TICKETHUB DISTRIBUTED ARCHITECTURE                               |
+-------------------------------------------------------------------------------------------+

                             [200,000 Client Browsers & Mobile Devices]
                                                |
                                                v
                              [Anycast DNS / Cloudflare Edge CDN]
                                                |
                                                v
                         [Virtual Waiting Room / Token-Bucket Queue]
                                                |
                                                v
                         [Layer 7 Load Balancer (AWS ALB / NGINX)]
                                                |
                                                +-----------------------+
                                                |                       |
                                                v                       v
                                    [Stateless App Node 1]   [Stateless App Node N]
                                                |                       |
                 +------------------------------+-----------------------+
                 |                              |                       |
                 v                              v                       v
      [Redis Cache Cluster]          [Primary Relational DB]   [Asynchronous Queue]
      - Session state                - ACID Transactions       - AWS SQS / RabbitMQ
      - Seat map bitmaps             - Master writes only               |
      - Distributed locks (NX)                  |                       v
                 ^                              v             [Notification Workers]
                 |                   [Read Replicas 1..M]     - Ticket PDF generation
                 +------------------ - Read-only queries      - Email dispatch
                                     - Event catalog cache    - Webhook triggers
+-------------------------------------------------------------------------------------------+
```

### 6.1 Component Responsibilities During Flash-Sale Surges

1. **Anycast DNS and Cloudflare Edge CDN:** Terminates SSL/TLS connections at edge locations worldwide, serving static front-end assets, venue geometry and public event catalog data directly from cache without touching origin infrastructure.
2. **Virtual Waiting Room (Queue Gatekeeper):** Regulates flash traffic by placing surplus concurrent users in a cryptographically signed, FIFO-ordered virtual waiting queue, releasing controlled batches of 2,000 users per minute to prevent downstream saturation.
3. **Layer 7 Load Balancer:** Distributes incoming HTTP requests across backend application servers using least-outstanding-requests routing while actively performing health checks to isolate degraded nodes.
4. **Stateless App Server Cluster:** Horizontally autoscaled container instances (ECS/Kubernetes) executing business logic, input validation, authentication and coordination between Redis locks and database transactions.
5. **Redis Cache and Distributed Lock Cluster:** High-performance in-memory cluster serving real-time seat availability bitmaps in sub-millisecond response times and resolving concurrent seat reservation claims via atomic `SETNX` commands.
6. **Primary Relational Database (PostgreSQL / AWS Aurora):** Dedicated write-master database enforcing relational integrity, foreign key constraints and ACID row-level locking for seat hold commits and order payments.
7. **Database Read Replica Fleet:** Horizontally replicated read-only database nodes offloading read queries for user profiles, order histories and static catalog lookups from the primary master.
8. **Asynchronous Message Queue (AWS SQS):** Decouples checkout confirmation from time-consuming downstream tasks by buffering confirmed order payloads into durable, fault-tolerant queues.
9. **Notification and Ticket Generation Worker Fleet:** Background worker fleet consuming messages from SQS to render cryptographically signed PDF tickets, generate QR codes, upload assets to object storage and dispatch email notifications.

---

## 7. Architectural Trade-Off Analysis

Every high-throughput architecture embodies conscious engineering trade-offs between competing priorities.

### 7.1 Trade-Off 1: Two-Tier Distributed Locking vs Pure Relational Pessimistic Locking

* **Alternative Evaluated:** Rely solely on PostgreSQL `SELECT ... FOR UPDATE` directly on the database row.
* **Decision:** Implement an in-memory Redis `SETNX` lock layer upstream of the database.
* **Trade-Off Analysis:** A pure database row-level locking strategy guarantees strict consistency with minimal architectural complexity. However, under 20,000 lock requests per second, thousands of competing transactions would queue in PostgreSQL, exhausting connection pools, inducing thread context-switching overhead and risking deadlocks. By inserting the Redis lock tier, 99% of competing requests are rejected at the memory tier in under 2 ms, allowing only the lock winner to touch the database. The accepted trade-off is managing cache-to-database state synchronization and handling edge-case cleanup if Redis and SQL fall out of sync.

### 7.2 Trade-Off 2: Virtual Waiting Room Gatekeeper vs Instant Unrestricted Access

* **Alternative Evaluated:** Allow all 200,000 concurrent visitors to hit backend application APIs immediately upon sale opening.
* **Decision:** Enforce a Cloudflare Virtual Waiting Room that queues users outside the core origin.
* **Trade-Off Analysis:** Instant unrestricted access provides an unencumbered user experience during normal traffic. However, during a 10-minute flash surge, unbounded traffic creates severe cascading failures across load balancers and database connection pools. The waiting room deliberately trades away instantaneous access for strict admission control and predictable throughput. Users experience a structured countdown queue, while the backend operates safely within provisioned capacity envelopes.

### 7.3 Trade-Off 3: Asynchronous Ticket Generation vs Synchronous Checkout Response

* **Alternative Evaluated:** Generate PDF tickets, cryptographic QR codes and email notifications synchronously within the `POST /orders/checkout` HTTP request.
* **Decision:** Persist order status as `CONFIRMED` in the primary database and dispatch downstream processing asynchronously via SQS.
* **Trade-Off Analysis:** Synchronous generation guarantees that when the HTTP request resolves, the user has their ticket in hand. However, PDF rendering and SMTP dispatch take 1,500 to 3,000 milliseconds, tying up application threads and database connections. Offloading generation to asynchronous workers reduces API response times to under 120 ms. The accepted trade-off is eventual consistency for ticket rendering: the order is confirmed immediately, while the digital pass appears in the user dashboard a few seconds later.

### 7.4 Single Point of Failure (SPOF) Mitigation Matrix

| System Component | Potential Failure Mode | Architectural Mitigation Strategy |
| :--- | :--- | :--- |
| **Edge CDN / DNS** | Regional network partition or DDoS | Multi-provider Anycast DNS routing and automated DDoS mitigation |
| **Virtual Waiting Room** | Token forgery or replay attack | Cryptographically signed HMAC tokens validated with rotating secret keys |
| **Load Balancer** | Hardware node failure | Active-active redundant ALB deployment across multiple availability zones |
| **App Server Node** | Application crash or OOM exception | Stateless design with automated container restarts and autoscaling groups |
| **Redis Lock Cluster** | Primary Redis node failure | Redis Sentinel with automatic failover and Multi-AZ replication |
| **Primary SQL Database** | Master instance hardware failure | Aurora Multi-AZ automatic failover with hot standby replica promotion in <30s |
| **Message Broker (SQS)** | Queue partition or message drop | Managed multi-AZ distributed queue with Dead Letter Queue (DLQ) retry policies |
| **Worker Fleet** | Worker crash during PDF generation | At-least-once message delivery with idempotent execution based on order ID |
