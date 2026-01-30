# Livrable Grading System - Setup Instructions

## Overview
This document provides step-by-step instructions to set up and test the livrable grading system.

## Prerequisites
- Supabase project configured
- Node.js and npm installed
- Project dependencies installed

## Step 1: Database Setup

### 1.1 Run SQL Migration
1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase-livrable-grading.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

This will create:
- 7 new tables (livrable_templates, grading_rubrics, livrable_submissions, etc.)
- RLS policies for secure access
- Database functions for grading operations
- Triggers for activity logging
- 3 default revision request templates

### 1.2 Verify Tables Created
Run this query to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'livrable%' OR table_name LIKE 'grading%' OR table_name LIKE 'revision%';
```

You should see:
- livrable_templates
- livrable_submissions
- livrable_grades
- grading_rubrics
- submission_comments
- revision_requests
- revision_request_templates

## Step 2: Storage Bucket Setup

### 2.1 Create Storage Bucket
1. In Supabase Dashboard, go to **Storage**
2. Click **New bucket**
3. Name: `livrable-submissions`
4. Set to **Private** (not public)
5. Click **Create bucket**

### 2.2 Configure Storage Policies
Run this SQL to set up storage policies:

```sql
-- Allow students to upload to their own folder
CREATE POLICY "Students can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'livrable-submissions' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow students to read their own files
CREATE POLICY "Students can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'livrable-submissions' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow coaches to read files in their programs
CREATE POLICY "Coaches can read program files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'livrable-submissions' 
  AND EXISTS (
    SELECT 1 FROM livrable_submissions ls
    JOIN program_coaches pc ON ls.program_id = pc.program_id
    WHERE ls.file_url LIKE '%' || name || '%'
    AND pc.coach_id = auth.uid()
  )
);

-- Allow admins full access
CREATE POLICY "Admins have full access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'livrable-submissions' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
```

## Step 3: Install Dependencies

### 3.1 Install Required Packages
The grading system uses iframe-based PDF viewing which works out of the box. However, for enhanced PDF features in the future, you can optionally install:

```bash
# Optional: For enhanced PDF.js integration
npm install pdfjs-dist react-pdf

# Optional: For rich text editing (TipTap)
npm install @tiptap/react @tiptap/starter-kit
```

**Note:** The current implementation works without these packages. They're only needed if you want to enhance the PDF viewer or add rich text editing to feedback.

## Step 4: Seed Test Data

### 4.1 Create Test Program
```sql
-- Create a test program
INSERT INTO programs (name, description, duration_weeks, start_date, end_date, capacity, status)
VALUES (
  'Entrepreneurship Bootcamp',
  'Test program for grading system',
  12,
  NOW(),
  NOW() + INTERVAL '12 weeks',
  20,
  'active'
);
```

### 4.2 Create Test Rubric
```sql
-- Create a test rubric
INSERT INTO grading_rubrics (name, description, criteria_json, weights_json, total_points)
VALUES (
  'Business Plan Rubric',
  'Standard rubric for business plan evaluation',
  '[
    {
      "id": "clarity",
      "name": "Clarity of Presentation",
      "description": "How well the ideas are communicated",
      "weight": 0.25,
      "maxScore": 100
    },
    {
      "id": "innovation",
      "name": "Innovation & Creativity",
      "description": "Originality and uniqueness of the business idea",
      "weight": 0.30,
      "maxScore": 100
    },
    {
      "id": "feasibility",
      "name": "Market Feasibility",
      "description": "Realistic assessment of market opportunity",
      "weight": 0.25,
      "maxScore": 100
    },
    {
      "id": "financials",
      "name": "Financial Planning",
      "description": "Quality of financial projections and planning",
      "weight": 0.20,
      "maxScore": 100
    }
  ]'::jsonb,
  '{
    "clarity": 0.25,
    "innovation": 0.30,
    "feasibility": 0.25,
    "financials": 0.20
  }'::jsonb,
  100
);
```

### 4.3 Create Livrable Template
```sql
-- Get the program and rubric IDs from previous inserts
-- Replace <program_id> and <rubric_id> with actual UUIDs

INSERT INTO livrable_templates (program_id, name, description, phase, phase_name, rubric_id)
VALUES (
  '<program_id>',
  'Business Plan - Phase 1',
  'Initial business plan submission',
  1,
  'Phase 1: Ideation',
  '<rubric_id>'
);
```

### 4.4 Assign Coach to Program
```sql
-- Replace <coach_id> and <program_id> with actual UUIDs
INSERT INTO program_coaches (program_id, coach_id)
VALUES ('<program_id>', '<coach_id>');
```

### 4.5 Create Test Submission
```sql
-- Replace <template_id>, <student_id>, and <program_id> with actual UUIDs
INSERT INTO livrable_submissions (
  template_id,
  student_id,
  program_id,
  file_url,
  file_name,
  file_size_bytes,
  version,
  status
)
VALUES (
  '<template_id>',
  '<student_id>',
  '<program_id>',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'business-plan-v1.pdf',
  13264,
  1,
  'new'
);
```

## Step 5: Access the Grading Interface

### 5.1 Navigate to Grading Dashboard
1. Log in as a coach
2. Navigate to `/coach/grading`
3. You should see the grading dashboard with the test submission

### 5.2 Test Grading Workflow
1. Click on a submission to open the grading interface
2. Verify PDF loads in the viewer
3. Test annotation mode:
   - Click "Add Annotations"
   - Click on the PDF to add a comment
   - Enter comment text and save
4. Test rubric scoring:
   - Enter scores for each criterion
   - Verify weighted score calculation
   - Add overall feedback
5. Test keyboard shortcuts:
   - `Ctrl+S` to save draft
   - `Ctrl+Enter` to submit grade (don't submit yet)
6. Test revision request:
   - Click "Request Revision"
   - Select a template
   - Add custom feedback
   - Send revision request
7. Test approval:
   - Grade a submission
   - Click "Approve & Advance"
   - Verify student receives notification

## Step 6: Verify Features

### 6.1 Check Real-time Updates
1. Open grading dashboard in two browser windows
2. Submit a grade in one window
3. Verify the other window updates automatically

### 6.2 Check Concurrent Grading Prevention
1. Open same submission in two browser windows (as different coaches)
2. First coach should lock the submission
3. Second coach should see "Currently being graded" message

### 6.3 Check Version History
1. Have a student resubmit (create version 2)
2. Open submission in grading interface
3. Click "Version History" tab
4. Verify both versions appear
5. Test comparison mode

### 6.4 Check Notifications
1. Submit a grade
2. Log in as the student
3. Verify notification appears
4. Click notification to view grade

## Troubleshooting

### PDF Not Loading
- Check that the file_url is accessible
- Verify storage bucket permissions
- Check browser console for errors

### Lock Not Working
- Verify `lock_submission_for_grading` function exists
- Check RLS policies on livrable_submissions table
- Ensure coach is assigned to the program

### Scores Not Calculating
- Verify rubric criteria_json is valid JSON
- Check that weights sum to 1.0
- Ensure all criterion IDs match between rubric and scores

### Notifications Not Sending
- Verify triggers are created
- Check notifications table for entries
- Ensure realtime is enabled for notifications table

## Next Steps

1. **Customize Rubrics**: Create rubrics specific to your program phases
2. **Add Templates**: Create more revision request templates
3. **Configure Phases**: Set up multi-phase deliverable workflows
4. **Train Coaches**: Provide training on the grading interface
5. **Monitor Usage**: Track grading metrics and student progress

## Support

For issues or questions:
1. Check the implementation_plan.md for detailed component documentation
2. Review the database schema in supabase-livrable-grading.sql
3. Check the browser console for JavaScript errors
4. Verify Supabase logs for database errors
