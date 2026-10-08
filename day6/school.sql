-- Day 6: Data & Storage
-- Deliverable: Relational School Database Schema, Seed Data and Analytical Queries
-- Engineer: Jesse Vincent
-- Repository: web-foundations-days/day6

-- ============================================================================
-- 1. DATABASE CONFIGURATION & DDL SCHEMA
-- ============================================================================

PRAGMA foreign_keys = ON;

-- Drop existing tables to guarantee idempotent test execution
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- Students Entity: Stores student biographical and authentication data
CREATE TABLE students (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Courses Entity: Stores academic curriculum catalog and credit weights
CREATE TABLE courses (
  id      INTEGER PRIMARY KEY,
  code    TEXT NOT NULL UNIQUE,
  title   TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK(credits > 0)
);

-- Enrolments Entity: Junction table resolving the Many-to-Many student-course relationship
CREATE TABLE enrolments (
  student_id  INTEGER NOT NULL,
  course_id   INTEGER NOT NULL,
  grade       TEXT DEFAULT NULL,
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Performance Optimization: Secondary B-tree index on course_id foreign key
-- Accelerates reverse lookups when querying enrollments by course
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

-- ============================================================================
-- 2. SEED DATA INSERTION (DML)
-- ============================================================================

-- Insert Student Records (including at least 1 student with zero enrolments)
INSERT INTO students (name, email) VALUES
  ('Amina Otieno', 'amina.otieno@example.com'),
  ('Brian Kamau', 'brian.kamau@example.com'),
  ('Catherine Mwangi', 'catherine.mwangi@example.com'),
  ('Daniel Kiprop', 'daniel.kiprop@example.com');

-- Insert Academic Courses
INSERT INTO courses (code, title, credits) VALUES
  ('CS101', 'Web Development Foundations', 3),
  ('CS102', 'Relational Database Systems', 4),
  ('CS103', 'Data Structures and Algorithms', 4),
  ('CS104', 'Distributed Systems Architecture', 3);

-- Insert Enrolments with letter grades
INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 'A'),
  (1, 2, 'A-'),
  (2, 1, 'B+'),
  (2, 3, 'B'),
  (3, 2, 'A'),
  (3, 4, 'B+');

-- ============================================================================
-- 3. REQUIRED ANALYTICAL QUERIES
-- ============================================================================

-- Query 1: All courses for a specific student (filtering by student name via JOIN)
SELECT
  students.name AS student_name,
  courses.code AS course_code,
  courses.title AS course_title,
  courses.credits,
  enrolments.grade
FROM students
JOIN enrolments ON students.id = enrolments.student_id
JOIN courses ON enrolments.course_id = courses.id
WHERE students.name = 'Amina Otieno';

-- Query 2: All students enrolled in a specific course (filtering by course code via JOIN)
SELECT
  courses.code AS course_code,
  courses.title AS course_title,
  students.name AS student_name,
  students.email AS student_email,
  enrolments.grade
FROM courses
JOIN enrolments ON courses.id = enrolments.course_id
JOIN students ON enrolments.student_id = students.id
WHERE courses.code = 'CS101';

-- Query 3: Count of enrolled students per course (using GROUP BY and COUNT)
SELECT
  courses.code AS course_code,
  courses.title AS course_title,
  COUNT(enrolments.student_id) AS enrolled_student_count
FROM courses
LEFT JOIN enrolments ON courses.id = enrolments.course_id
GROUP BY courses.id, courses.code, courses.title;

-- Query 4: Students who have zero enrolments (using LEFT JOIN and WHERE IS NULL)
SELECT
  students.id AS student_id,
  students.name AS student_name,
  students.email AS student_email
FROM students
LEFT JOIN enrolments ON students.id = enrolments.student_id
WHERE enrolments.student_id IS NULL;

-- Query 5: Update a specific enrolment grade (using UPDATE with explicit WHERE clause)
UPDATE enrolments
SET grade = 'A+'
WHERE student_id = 2 AND course_id = 1;

-- Verification of Query 5: Confirm updated grade for Brian Kamau in CS101
SELECT
  students.name AS student_name,
  courses.code AS course_code,
  enrolments.grade
FROM enrolments
JOIN students ON enrolments.student_id = students.id
JOIN courses ON enrolments.course_id = courses.id
WHERE students.id = 2 AND courses.id = 1;
