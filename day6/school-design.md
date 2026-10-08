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
┌────────────────┐             ┌────────────────────────┐             ┌────────────────┐
│    students    │             │       enrolments       │             │    courses     │
├────────────────┤             ├────────────────────────┤             ├────────────────┤
│ id (PK)        │ 1 ────────< ∞ │ student_id (PK, FK1)   │ ∞ >──────── 1 │ id (PK)        │
│ name           │             │ course_id  (PK, FK2)   │             │ code           │
│ email (UQ)     │             │ grade                  │             │ title          │
│ created_at     │             │ enrolled_at            │             │ credits (CHECK)│
└────────────────┘             └────────────────────────┘             └────────────────┘
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

For the school management registry domain, a relational SQL engine (such as SQLite or PostgreSQL) was selected over a NoSQL document store (such as MongoDB or CouchDB). The evaluation centers on three critical technical pillars:

| Architectural Dimension | Relational SQL (SQLite / PostgreSQL) | NoSQL Document Store (MongoDB) | Academic Domain Verdict |
| :--- | :--- | :--- | :--- |
| **ACID Transaction Guarantees** | Native multi-statement atomicity and serializability | Eventual consistency or complex multi-document sessions | **SQL Wins:** Enrollment, grading and capacity checks require absolute transactional consistency. |
| **Referential Integrity** | Engine-enforced foreign keys and cascading rules | Client application logic must manage dangling references | **SQL Wins:** Database engine guarantees zero orphaned enrollments even if server processes crash. |
| **Data Redundancy and Normalization** | Strict 3NF normalization; each entity updated once | Embedded documents duplicate student data across courses | **SQL Wins:** Updating a student's legal name or course title occurs in a single row without fan-out inconsistencies. |
| **Domain Schema Stability** | Rigid schema with type enforcement and check constraints | Flexible, schemaless documents | **SQL Wins:** Academic institutions possess predictable, well-defined operational structures. |

### Domain Evaluation
Academic registries demand strict consistency over arbitrary horizontal write scaling. An enrollment operation is a transactional boundary: when a student enrolls, the seat allocation must decrement, the relationship record must persist and student prerequisites must validate atomically.

In a document database, embedding courses inside student documents makes querying class rosters expensive and risks exceeding maximum document size limits. Conversely, embedding students inside course documents leads to write contention when dozens of students register concurrently for the same class. Relational SQL guarantees normalized storage, engine-level referential checks (`FOREIGN KEY`) and data integrity constraints (`CHECK`, `UNIQUE`, `NOT NULL`) that make it the superior architecture for academic registries.

---

## 6. Analytical Queries Summary

The companion script `school.sql` implements five production-grade queries demonstrating core relational operations:

1. **Student Course Roster (Query 1):** Two-table inner join retrieving curriculum records for a specific student name.
2. **Course Student Roster (Query 2):** Two-table inner join querying student participant details by departmental course code.
3. **Cohort Aggregation (Query 3):** Left outer join coupled with `GROUP BY` and `COUNT` calculating total enrollments per course while retaining zero-enrollment courses.
4. **Inactive Student Identification (Query 4):** Left outer join filtering with `WHERE enrolments.student_id IS NULL` to isolate students possessing zero active enrollments.
5. **Atomic Grade Modification (Query 5):** Scoped `UPDATE` statement targeting a specific `(student_id, course_id)` intersection to update academic grades.
