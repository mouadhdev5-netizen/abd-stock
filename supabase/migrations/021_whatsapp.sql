-- Phase 12 WhatsApp Tables

-- 1. WhatsApp Sessions (Stores connection state)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'disconnected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WhatsApp Templates (Reusable message bodies)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WhatsApp Messages (History of sent messages)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company whatsapp_sessions" ON whatsapp_sessions
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
CREATE POLICY "Users can insert own company whatsapp_sessions" ON whatsapp_sessions
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
CREATE POLICY "Users can update own company whatsapp_sessions" ON whatsapp_sessions
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
CREATE POLICY "Users can delete own company whatsapp_sessions" ON whatsapp_sessions
  FOR DELETE USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view own company whatsapp_templates" ON whatsapp_templates
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
CREATE POLICY "Users can insert own company whatsapp_templates" ON whatsapp_templates
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
CREATE POLICY "Users can update own company whatsapp_templates" ON whatsapp_templates
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
CREATE POLICY "Users can delete own company whatsapp_templates" ON whatsapp_templates
  FOR DELETE USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view own company whatsapp_messages" ON whatsapp_messages
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
CREATE POLICY "Users can insert own company whatsapp_messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
