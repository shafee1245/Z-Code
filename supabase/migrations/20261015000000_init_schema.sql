-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create qrcodes table for dynamic QR codes
CREATE TABLE IF NOT EXISTS qrcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  target_url TEXT NOT NULL,
  short_slug VARCHAR(255) NOT NULL UNIQUE,
  style_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create scan_analytics table for tracking scans
CREATE TABLE IF NOT EXISTS scan_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qrcode_id UUID NOT NULL REFERENCES qrcodes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(100),
  country VARCHAR(100)
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qrcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for qrcodes
CREATE POLICY "Users can view own qrcodes" ON qrcodes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own qrcodes" ON qrcodes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own qrcodes" ON qrcodes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own qrcodes" ON qrcodes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for scan_analytics
-- Users can view analytics for their own QR codes
CREATE POLICY "Users can view own qrcode analytics" ON scan_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM qrcodes
      WHERE qrcodes.id = scan_analytics.qrcode_id
      AND qrcodes.user_id = auth.uid()
    )
  );

-- Allow inserts for scan tracking (public access for redirect endpoint)
CREATE POLICY "Allow insert for scan tracking" ON scan_analytics
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qrcodes_user_id ON qrcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_qrcodes_short_slug ON qrcodes(short_slug);
CREATE INDEX IF NOT EXISTS idx_scan_analytics_qrcode_id ON scan_analytics(qrcode_id);
CREATE INDEX IF NOT EXISTS idx_scan_analytics_scanned_at ON scan_analytics(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_analytics_country ON scan_analytics(country);
CREATE INDEX IF NOT EXISTS idx_scan_analytics_device_type ON scan_analytics(device_type);
