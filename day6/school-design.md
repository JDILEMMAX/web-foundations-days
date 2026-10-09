# Technical Architecture Document: Relational School Database Design

[![Author](https://img.shields.io/badge/Engineer-Jesse%20Vincent-blue.svg)](https://github.com/JDILEMMAX)
[![Module](https://img.shields.io/badge/PLP-Web%20Foundations%20Day%206-red.svg)](https://powerlearnproject.org)
[![Engine](https://img.shields.io/badge/Engine-SQLite%203%20%2F%20ANSI%20SQL-brightgreen.svg)](#)
[![Standards](https://img.shields.io/badge/Schema-Third%20Normal%20Form%20(3NF)-orange.svg)](#)

An architectural specification documenting entity relationships, composite primary keys, indexing strategies and transactional trade-offs for the academic enrollment data layer.

---

## 1. Executive Summary

The school database subsystem provides a normalized, relational data tier tracking students, academic courses and student course enrollments. Designed to operate under standard ANSI SQL and SQLite 3 runtimes, the system guarantees strict data integrity through foreign key constraints, column-level domain boundaries and composite primary key enforcement.

---

## 2. Entity and Table Architecture

The schema partitions the academic domain into three distinct entities structured in Third Normal Form (3NF) to eliminate insertion, update and deletion anomalies.

### 2.1 Table: `students`
* **Purpose:** Acts as the primary identity ledger for enrolled individuals.
* **Columns:**
  * `id` (`INTEGER PRIMARY KEY`): Unique internal identifier serving as the primary lookup key.
  * `name` (`TEXT NOT NULL`): Full legal student name.
  * `email` (`TEXT NOT NULL UNIQUE`): Unique communication handle preventing duplicate identity registration.
  * `created_at` (`TEXT DEFAULT CURRENT_TIMESTAMP`): Immutable audit timestamp logging record creation.

### 2.2 Table: `courses`
* **Purpose:** Represents the institutional curriculum catalog of accredited study modules.
* **Columns:**
  * `id` (`INTEGER PRIMARY KEY`): Unique internal identifier for course catalog entries.
  * `code` (`TEXT NOT NULL UNIQUE`): Alphanumeric departmental course code (e.g. `CS101`) enforcing unique catalog identifiers.
  * `title` (`TEXT NOT NULL`): Descriptive title of the instructional unit.
  * `credits` (`INTEGER NOT NULL CHECK(credits > 0)`): Academic weighting, constrained strictly to positive integer values.

### 2.3 Table: `enrolments`
* **Purpose:** Operates as a junction (associative) table bridging the Many-to-Many association between students and courses while storing relationship-specific attributes.
* **Columns:**
  * `student_id` (`INTEGER NOT NULL`): Foreign key referencing `students(id)`.
  * `course_id` (`INTEGER NOT NULL`): Foreign key referencing `courses(id)`.
  * `grade` (`TEXT DEFAULT NULL`): Final academic letter grade or performance evaluation, nullable to accommodate in-flight semesters.
  * `enrolled_at` (`TEXT DEFAULT CURRENT_TIMESTAMP`): Audit timestamp recording when registration occurred.

---

## 3. Relationship Modeling and Junction Architecture

```text
┌──────────────────┐         ┌──────────────────────────┐         ┌──────────────────┐
│     students     │         │        enrolments        │         │     courses      │
├──────────────────┤         ├──────────────────────────┤         ├──────────────────┤
│ id (PK)          │<───┐    │ student_id (PK, FK1)     │    ┌───>│ id (PK)          │
│ name             │    └───┤ course_id  (PK, FK2)     ├────┘    │ code (UQ)        │
│ email (UQ)       │         │ grade                    │         │ title            │
│ created_at       │         │ enrolled_at              │         │ credits (CHECK)  │
└──────────────────┘         └──────────────────────────┘         └──────────────────┘
```

### 3.1 Many-to-Many Cardinality
In academic institutions:
1. One student enrolls in multiple courses throughout their degree program.
2. One course accepts multiple students simultaneously across cohorts.

Directly embedding course identifiers inside `students` (e.g. comma-separated text `"1,2,3"`) violates First Normal Form (1NF), degrades index performance and prevents atomic querying. Conversely, storing student identifiers inside `courses` introduces unconstrained column scaling and record contention.

### 3.2 Junction Table with Composite Primary Key
The `enrolments` junction table normalizes this relationship by decomposing one Many-to-Many association into two One-to-Many associations:
* `students(id)` `1` to `∞` `enrolments(student_id)`
* `courses(id)` `1` to `∞` `enrolments(course_id)`

The table enforces a **Composite Primary Key** on `(student_id, course_id)`. This architectural constraint provides two critical invariants:
1. **Uniqueness Guarantee:** A student cannot enroll in the same course more than once within the catalog. Attempting to insert a duplicate pair triggers a primary key constraint violation at the storage engine level.
2. **Entity Identity:** Every row is uniquely identified without requiring an artificial surrogate integer key (`id`), saving storage overhead and aligning key structure with business reality.

### 3.3 Referential Integrity and Cascading Rules
Both foreign keys utilize `ON DELETE CASCADE`. If an administrative transaction purges a student or a course from the database, the engine automatically removes all dependent enrollment records. This guarantees zero orphaned records and maintains relational consistency without requiring manual multi-table cleanup scripts.

---

## 4. Indexing Strategy and Query Latency Optimization

### 4.1 Composite Primary Key Asymmetry
By defining `PRIMARY KEY (student_id, course_id)`, SQLite automatically builds a unique clustered B-tree index on `(student_id, course_id)`.

Because B-tree composite indexes follow leftmost prefix rules:
* Queries filtering by `student_id` (such as Query 1: "Find all courses for student X") execute with `O(log N)` lookup latency because `student_id` is the leading index column.
* Queries filtering solely by `course_id` (such as Query 2: "Find all students on course Y" or Query 3: "Count students per course") cannot leverage the composite index efficiently. The database engine would otherwise default to an `O(N)` full table scan across all enrollment rows.

### 4.2 Recommended Secondary B-Tree Index
To eliminate this bottleneck, we define a dedicated secondary index on the foreign key column:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
```

### 4.3 Performance Justification
1. **Join Latency Reduction:** When joining `courses` to `enrolments` via `courses.id = enrolments.course_id`, the database query planner utilizes `idx_enrolments_course_id` to perform index seeks rather than full scans.
2. **Aggregation Acceleration:** Calculating cohort rosters or enrollment headcounts per course executes in logarithmic time relative to catalog scale.
3. **Write Overhead Trade-Off:** While maintaining secondary B-trees consumes marginal disk space and incurs negligible write latency during `INSERT` statements, enrollment operations in school management systems are read-heavy (transcripts, rosters and audits exceed registrations by several orders of magnitude).

---

## 5. Architectural Trade-Off Analysis: Relational SQL vs NoSQL

For the school management registry domain, a relational SQL engine (such as SQLite or PostgreSQL) was selected over a NoSQL document store (such as MongoDB or CouchDB). Academic record systems present domain-specific requirements that disqualify eventual consistency and document embedding models.

### 5.1 ACID Transactional Guarantees in Academic Records
Academic institutional record-keeping requires absolute transactional guarantees during registration periods, grade finalization and transcript audits:

* **Atomicity:** Enrollment is inherently a multi-step operation. Registering a student requires validating course prerequisites, checking classroom seat availability, inserting an entry into `enrolments` and decrementing the course remaining capacity. In SQL, this sequence executes within an atomic boundary:

```sql
BEGIN TRANSACTION;
-- 1. Verify seat availability and prerequisite status
-- 2. Record enrollment
INSERT INTO enrolments (student_id, course_id) VALUES (4, 1);
-- 3. Decrement seat capacity
UPDATE courses SET available_seats = available_seats - 1 WHERE id = 1 AND available_seats > 0;
COMMIT;
```

If any validation step fails or the database server crashes mid-flight, the entire transaction rolls back completely. In contrast, document stores lack native multi-document relational atomicity without expensive distributed two-phase commits. In eventual-consistency architectures, a network partition or concurrent request race leads to ghost registrations or oversubscribed classrooms where multiple students receive conflicting confirmations for the last available seat.

* **Consistency:** Relational engines enforce invariants on every write operation. If a transaction attempts to insert a duplicate enrollment, assign a negative credit value or reference a non-existent student, the storage engine rejects the transaction immediately. The database transitions from one valid state to another with zero tolerance for corrupted intermediary states.

* **Isolation:** During peak registration periods, thousands of students register for high-demand courses within seconds. Relational engines support serializable and repeatable read isolation levels with row-level locks, preventing dirty reads, non-repeatable reads and phantom rows.

* **Durability:** Once a student enrollment or final grade commit completes, the data persists to write-ahead logs (`WAL`) on non-volatile storage. Power outages or process terminations cannot discard committed academic achievements.

### 5.2 Engine-Level Referential Integrity and Declarative Schema Enforcement
In relational database systems, referential integrity is guaranteed by the core storage engine rather than delegated to client software:

* **Declarative Constraints:** Constraints such as `NOT NULL`, `UNIQUE`, `CHECK(credits > 0)` and `FOREIGN KEY ... ON DELETE CASCADE` reside inside the database catalog. Regardless of whether queries originate from a backend API server, a batch migration worker, an administration script or an ad-hoc developer console, the rules apply universally.
* **Failure Modes in NoSQL:** In document databases, referential integrity is externalized into application-level middleware. If an application service crashes mid-execution, a student document might be deleted while references to that student remain embedded in hundreds of course documents. Over time, these orphaned pointers accumulate, creating data corruption and phantom dependencies that require expensive offline repair scripts to clean up. In SQL, the engine itself enforces cascading purges and constraint validation atomically.

### 5.3 Data Redundancy, Unbounded Document Growth and Write Contention
Attempting to model school registries within document-oriented NoSQL architectures results in structural anti-patterns:

1. **Embedding Courses inside Student Documents:**
   * If each student document embeds an array of course objects, updating a course title or schedule requires updating thousands of separate student documents (fan-out write penalty).
   * As students complete four-year degree programs, graduate studies and certifications, student documents experience unbounded growth, degrading cache efficiency and approaching document size ceilings (such as MongoDB's 16MB document boundary).

2. **Embedding Students inside Course Documents:**
   * If course documents maintain an array of enrolled students, high-demand courses suffer severe document-level lock contention. When hundreds of students attempt to register for the same course simultaneously, concurrent writes to the same course document result in write conflicts, lock waiting timeouts and degraded throughput.

3. **Normalization in Third Normal Form (3NF):**
   * Relational SQL solves both dilemmas by isolating entities into independent tables (`students`, `courses`) and managing relationships through a compact junction table (`enrolments`).
   * Each fact is stored exactly once. Updating a student's legal name or changing a course code requires modifying a single row. The junction table stores lightweight foreign key integer pairs, delivering optimal write concurrency and zero data redundancy.

### 5.4 Architectural Evaluation Matrix: Relational SQL vs NoSQL Document Stores

| Architectural Dimension | Relational SQL (SQLite / PostgreSQL) | NoSQL Document Store (MongoDB) | Academic Domain Verdict |
| :--- | :--- | :--- | :--- |
| **ACID Transaction Guarantees** | Native multi-statement atomicity, serializable isolation and WAL durability | Eventual consistency or high-latency multi-document distributed transactions | **SQL Wins:** Course registration, tuition billing and grade updates require strict consistency. |
| **Referential Integrity** | Engine-enforced foreign keys with automatic cascading deletions | Manual application logic; vulnerable to orphaned records upon server crash | **SQL Wins:** Zero orphaned enrollments guaranteed at the storage engine tier. |
| **Schema Enforcement** | Strict DDL types, column nullability and declarative CHECK expressions | Schema-optional or advisory validation; inconsistent formats across document versions | **SQL Wins:** Institutional curriculum structures possess rigid, well-defined standards. |
| **Write Concurrency and Contention** | Fine-grained row-level locking on compact junction table records | Document-level locks on shared course records cause severe registration write bottlenecks | **SQL Wins:** Independent junction inserts scale smoothly across concurrent applicants. |
| **Data Redundancy** | Third Normal Form (3NF); entity updates execute in a single row | Denormalized embedded objects create data duplication and update anomalies | **SQL Wins:** Eliminates fan-out updates when course catalogs or student profiles change. |
| **Ad-Hoc Analytical Querying** | Powerful SQL joins, aggregations (`GROUP BY`, `COUNT`) and window functions | Aggregation pipelines require complex multi-stage lookups and denormalized scans | **SQL Wins:** Generating transcripts, GPA rankings and accreditation audits is straightforward. |

---

## 6. Analytical Queries Summary

The companion script `school.sql` implements five production-grade queries demonstrating core relational operations:

1. **Student Course Roster (Query 1):** Two-table inner join retrieving curriculum records for a specific student name.
2. **Course Student Roster (Query 2):** Two-table inner join querying student participant details by departmental course code.
3. **Cohort Aggregation (Query 3):** Left outer join coupled with `GROUP BY` and `COUNT` calculating total enrollments per course while retaining zero-enrollment courses.
4. **Inactive Student Identification (Query 4):** Left outer join filtering with `WHERE enrolments.student_id IS NULL` to isolate students possessing zero active enrollments.
5. **Atomic Grade Modification (Query 5):** Scoped `UPDATE` statement targeting a specific `(student_id, course_id)` intersection to update academic grades.
