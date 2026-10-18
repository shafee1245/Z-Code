import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, BarChart3, ChevronDown, QrCode } from "lucide-react";
import AnalyticsCharts from "@/components/AnalyticsCharts";

export default function AnalyticsPage() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark"><QrCode size={20} strokeWidth={2.3} /></span>
          <span>qr<span className="brand-dot">.</span>studio</span>
        </Link>
        <div className="workspace-switcher">
          <span className="workspace-avatar">F</span>
          <span className="workspace-copy">
            <strong>Fieldnotes Studio</strong>
            <small>Free workspace</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <Link className="nav-item" href="/"><QrCode size={17} /> QR codes</Link>
          <Link className="nav-item active" href="/analytics"><BarChart3 size={17} /> Analytics</Link>
        </nav>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <Link href="/">Workspace</Link><span className="crumb-slash">/</span><strong>Analytics</strong>
          </div>
          <button className="secondary-button export-report">
            <ArrowDownToLine size={15} /> Export report
          </button>
        </header>
        <div className="page-content analytics-page">
          <div className="page-intro">
            <div>
              <div className="eyebrow intro-eyebrow">PERFORMANCE</div>
              <h1>Analytics</h1>
              <p>Know what gets scanned, and where it takes people.</p>
            </div>
            <button className="date-filter" type="button">Last 7 days <ChevronDown size={15} /></button>
          </div>
          <section className="analytics-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">SCAN ACTIVITY</span>
                <h2>Scans over time</h2>
              </div>
            </div>
            <AnalyticsCharts slug={null} />
          </section>
        </div>
      </main>
    </div>
  );
}
