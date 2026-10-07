# RESTful API Specification: Library Books Service

[![Author](https://img.shields.io/badge/Engineer-Jesse%20Vincent-blue.svg)](https://github.com/JDILEMMAX)
[![Standard](https://img.shields.io/badge/Standard-REST%20%2F%20HTTP%201.1-green.svg)](#)
[![Format](https://img.shields.io/badge/Payload-JSON-orange.svg)](#)

Enterprise API specification for the `/books` resource within the QuickNotes and Library Service Architecture.

---

## 1. Architectural Overview

* **Base URL:** `https://api.library.quicknotes.internal/v1`
* **Transport:** HTTPS with TLS 1.3
* **Content Negotiation:** `application/json` for request bodies and response payloads
* **Character Encoding:** UTF-8
* **Authentication:** Bearer token authorization header (`Authorization: Bearer <token>`)

---

## 2. Resource Data Model

The `Book` entity represents an individual literary work in the catalog.

| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `id` | integer | Unique identifier assigned by the database | Auto-incrementing, read-only |
| `title` | string | Full title of the book | Required, 1 to 255 characters |
| `author` | string | Primary author or contributor | Required, 1 to 150 characters |
| `isbn` | string | 13-digit International Standard Book Number | Required, valid ISBN-13 format |
| `publishedYear` | integer | Calendar year of initial publication | Required, 1450 to current year |
| `availableCopies`| integer | Number of circulating copies in stock | Required, integer >= 0 |

---

## 3. Endpoints Matrix

| Method | Endpoint | Description | Success Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/books` | Retrieve the complete catalog of books | `200 OK` |
| `GET` | `/books?author={author}` | Filter the book collection by author name | `200 OK` |
| `GET` | `/books/{id}` | Fetch a single book record by ID | `200 OK` |
| `POST` | `/books` | Create a new book record | `201 Created` |
| `PATCH`| `/books/{id}` | Partially update fields of an existing book | `200 OK` |
| `DELETE`| `/books/{id}` | Remove a book record from the catalog | `204 No Content` |

---

## 4. Endpoint Specifications

### 4.1 Browse Book Catalog
* **Method & Path:** `GET /books`
* **Description:** Returns an array of all active book records in the catalog.
* **Request Body:** None
* **Success Status Code:** `200 OK`
* **Example Response:**

```json
[
  {
    "id": 101,
    "title": "Designing Data-Intensive Applications",
    "author": "Martin Kleppmann",
    "isbn": "978-1449373320",
    "publishedYear": 2017,
    "availableCopies": 5
  },
  {
    "id": 102,
    "title": "Clean Architecture",
    "author": "Robert C. Martin",
    "isbn": "978-0134494166",
    "publishedYear": 2017,
    "availableCopies": 3
  }
]
```

---

### 4.2 Filter Books by Author
* **Method & Path:** `GET /books?author={author}`
* **Description:** Returns books whose author matches the query string value (case-insensitive substring match).
* **Query Parameter:** `author` (string, URL-encoded)
* **Request Body:** None
* **Success Status Code:** `200 OK`
* **Example Request:** `GET /books?author=Kleppmann`
* **Example Response:**

```json
[
  {
    "id": 101,
    "title": "Designing Data-Intensive Applications",
    "author": "Martin Kleppmann",
    "isbn": "978-1449373320",
    "publishedYear": 2017,
    "availableCopies": 5
  }
]
```

---

### 4.3 Get Single Book by ID
* **Method & Path:** `GET /books/{id}`
* **Description:** Retrieves the detailed record for a single book identified by its integer ID.
* **Path Parameter:** `id` (integer)
* **Request Body:** None
* **Success Status Code:** `200 OK`
* **Example Request:** `GET /books/101`
* **Example Response:**

```json
{
  "id": 101,
  "title": "Designing Data-Intensive Applications",
  "author": "Martin Kleppmann",
  "isbn": "978-1449373320",
  "publishedYear": 2017,
  "availableCopies": 5
}
```

---

### 4.4 Create Book
* **Method & Path:** `POST /books`
* **Description:** Validates and stores a new book entity in the catalog.
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**

```json
{
  "title": "System Design Interview",
  "author": "Alex Xu",
  "isbn": "979-8664653403",
  "publishedYear": 2020,
  "availableCopies": 8
}
```

* **Success Status Code:** `201 Created`
* **Response Headers:** `Location: /v1/books/103`
* **Example Response:**

```json
{
  "id": 103,
  "title": "System Design Interview",
  "author": "Alex Xu",
  "isbn": "979-8664653403",
  "publishedYear": 2020,
  "availableCopies": 8
}
```

---

### 4.5 Partial Update of Book
* **Method & Path:** `PATCH /books/{id}`
* **Description:** Modifies specified attributes of an existing book without overwriting omitted fields.
* **Path Parameter:** `id` (integer)
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**

```json
{
  "availableCopies": 7
}
```

* **Success Status Code:** `200 OK`
* **Example Response:**

```json
{
  "id": 103,
  "title": "System Design Interview",
  "author": "Alex Xu",
  "isbn": "979-8664653403",
  "publishedYear": 2020,
  "availableCopies": 7
}
```

---

### 4.6 Delete Book
* **Method & Path:** `DELETE /books/{id}`
* **Description:** Permanently deletes the book entity identified by ID from the catalog.
* **Path Parameter:** `id` (integer)
* **Request Body:** None
* **Success Status Code:** `204 No Content`
* **Response Body:** Empty

---

## 5. Explicit Error Handling Architecture

All error responses return a standardized RFC 7807 problem detail envelope.

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Detailed description of validation failure",
  "timestamp": "2026-10-07T16:55:00Z"
}
```

### 5.1 HTTP 400 Bad Request
Occurs when the client sends malformed JSON, omits mandatory schema fields or violates validation boundaries.

* **Scenario A: Missing Mandatory Field during POST**
  * **Trigger:** Client sends a POST payload omitting the required `title` property.
  * **Status Code:** `400 Bad Request`
  * **Response Payload:**

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Field 'title' is required and cannot be empty.",
  "timestamp": "2026-10-07T16:55:01Z"
}
```

* **Scenario B: Negative Inventory Constraint Violation**
  * **Trigger:** Client attempts to set `availableCopies` to `-2` via `PATCH /books/103`.
  * **Status Code:** `400 Bad Request`
  * **Response Payload:**

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Field 'availableCopies' must be an integer greater than or equal to zero.",
  "timestamp": "2026-10-07T16:55:02Z"
}
```

* **Scenario C: Malformed ISBN Pattern**
  * **Trigger:** Client submits an ISBN that does not match standard 13-digit numbering formats.
  * **Status Code:** `400 Bad Request`
  * **Response Payload:**

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Field 'isbn' must follow standard ISBN-13 hyphenated format.",
  "timestamp": "2026-10-07T16:55:03Z"
}
```

---

### 5.2 HTTP 404 Not Found
Occurs when the requested target resource ID does not exist in the catalog or has been deleted previously.

* **Scenario A: Querying Non-Existent Resource ID**
  * **Trigger:** Client executes `GET /books/999` where no book exists with ID `999`.
  * **Status Code:** `404 Not Found`
  * **Response Payload:**

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Book resource with ID 999 does not exist.",
  "timestamp": "2026-10-07T16:55:04Z"
}
```

* **Scenario B: Patching or Deleting Purged Resource**
  * **Trigger:** Client executes `DELETE /books/999` or `PATCH /books/999` against an absent record.
  * **Status Code:** `404 Not Found`
  * **Response Payload:**

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Book resource with ID 999 not found for modification.",
  "timestamp": "2026-10-07T16:55:05Z"
}
```

---

## 6. HTTP Status Code Summary

| Status Code | Reason Phrase | HTTP Method Usage | Context |
| :--- | :--- | :--- | :--- |
| `200` | OK | `GET`, `PATCH` | Resource retrieved or updated successfully |
| `201` | Created | `POST` | New book created; includes `Location` header |
| `204` | No Content | `DELETE` | Resource deleted; no payload returned |
| `400` | Bad Request | `POST`, `PATCH` | Schema validation error or malformed payload |
| `404` | Not Found | `GET`, `PATCH`, `DELETE`| Target book ID does not exist in database |
| `500` | Internal Server Error | Any | Unhandled server exception |
