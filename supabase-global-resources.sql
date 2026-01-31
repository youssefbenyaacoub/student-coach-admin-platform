-- Global Resources for Students
-- Includes templates, guides, and helpful documents

CREATE TABLE IF NOT EXISTS global_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('Templates', 'Guides', 'Legal', 'Financial', 'Marketing', 'General')),
  url TEXT NOT NULL,
  file_type TEXT, -- e.g. 'PDF', 'DOCX', 'Link'
  icon_name TEXT, -- Lucide icon name or emoji
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE global_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global resources are viewable by everyone" ON global_resources
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage global resources" ON global_resources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_global_resources_updated_at BEFORE UPDATE ON global_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data for initial helpful documents
INSERT INTO global_resources (title, description, category, url, file_type, icon_name, is_featured)
VALUES 
('Business Model Canvas Template', 'A strategic management template for developing new or documenting existing business models.', 'Templates', 'https://example.com/bmc-template.pdf', 'PDF', 'Layout', true),
(' Pitch Deck Guide', 'Everything you need to know about creating a winning pitch deck for investors.', 'Guides', 'https://example.com/pitch-deck-guide.pdf', 'PDF', 'Presentation', true),
('Startup Legal Checklist', 'Key legal steps and documents needed when starting a business in Tunisia.', 'Legal', 'https://example.com/legal-checklist.pdf', 'PDF', 'ShieldCheck', false),
('Financial Projection Spreadsheet', 'Excel template to help you forecast your revenue and expenses.', 'Financial', 'https://example.com/financials.xlsx', 'XLSX', 'BarChart', true),
('Go-to-Market Strategy Guide', 'A comprehensive guide on how to launch your product successfully.', 'Marketing', 'https://example.com/gtm-guide.pdf', 'PDF', 'Send', false);
