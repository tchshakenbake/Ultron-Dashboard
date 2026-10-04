'use client';

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';

type Mission = { id: string; title: string; detail: string; priority: 'CRITICAL' | 'HIGH' | 'NORMAL'; progress: number; due: string };
type DataMode = 'LOADING' | 'CONNECTED' | 'PREVIEW' | 'UNAVAILABLE';
type ApiMission = { id: string; title: string; description: string; status: string; priority: string; due_at: string | null };
type ApiTask = { id: string; mission_id: string; is_complete: boolean };
type Workspace = { id: string; name: string };
type MissionProposal = { id: string; action_summary: string; action_payload: { title: string; description: string; priority: string; due_at: string | null; workspace_id: string }; expires_at: string; status: string };
type Notice = { id: number; title: string; detail: string; time: string; tone: 'red' | 'amber' | 'blue' };

const initialMissions: Mission[] = [
  { id: 'M-001', title: 'Establish core architecture', detail: 'Foundation · Stage 01', priority: 'CRITICAL', progress: 68, due: 'TODAY' },
  { id: 'M-002', title: 'Configure voice interface', detail: 'Voice systems · Research', priority: 'HIGH', progress: 24, due: 'NEXT' },
  { id: 'M-003', title: 'Map creator workflow', detail: 'Operations · Planning', priority: 'NORMAL', progress: 12, due: 'LATER' },
];

const initialNotices: Notice[] = [
  { id: 1, title: 'Operator approval required', detail: 'A proposed action is waiting for review.', time: 'JUST NOW', tone: 'red' },
  { id: 2, title: 'Voice provider not configured', detail: 'No voice service has been connected.', time: 'SYSTEM', tone: 'amber' },
  { id: 3, title: 'Workspace initialized', detail: 'Local interface is ready for exploration.', time: 'SESSION', tone: 'blue' },
];

const navItems = [
  { label: 'Command', icon: '⌘' },
  { label: 'Missions', icon: '◈' },
  { label: 'Intelligence', icon: '⌁' },
  { label: 'Voice', icon: '◖' },
  { label: 'Activity', icon: '≋' },
  { label: 'Settings', icon: '⚙' },
];

const fieldStyle: CSSProperties = { width: '100%', marginTop: 6, background: '#0b0e13', color: '#f0f2f6', border: '1px solid #353b45', borderRadius: 5, padding: '10px 12px', display: 'block' };

function FaceMark() {
  return (
    <svg viewBox="0 0 150 170" aria-hidden="true" className="face-mark">
      <defs>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f2f3f4"/><stop offset=".35" stopColor="#7b8088"/><stop offset=".64" stopColor="#d5d8dc"/><stop offset="1" stopColor="#454a52"/></linearGradient>
        <linearGradient id="eye" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ff8a54"/><stop offset=".5" stopColor="#ff312e"/><stop offset="1" stopColor="#ff8a54"/></linearGradient>
      </defs>
      <path d="M75 5 116 23 137 57 129 111 105 145 75 163 45 145 21 111 13 57 34 23Z" fill="#101216" stroke="#777e87" strokeWidth="2"/>
      <path d="M75 12 108 29 125 61 118 106 98 135 75 150 52 135 32 106 25 61 42 29Z" fill="url(#metal)" stroke="#e5e7eb" strokeOpacity=".55"/>
      <path d="M42 43 75 32 108 43 99 62 75 70 51 62Z" fill="#292d33" stroke="#555b64"/>
      <path d="M38 72 63 66 72 76 60 84 39 81Z" fill="url(#eye)"/><path d="M112 72 87 66 78 76 90 84 111 81Z" fill="url(#eye)"/>
      <path d="M75 69 66 96 75 104 84 96Z" fill="#535962" stroke="#e6e8eb" strokeOpacity=".65"/>
      <path d="M52 105 65 112 75 109 85 112 98 105 92 128 75 137 58 128Z" fill="#22262c" stroke="#737a83" strokeWidth="1.5"/>
      <path d="M62 118h26M65 124h20" stroke="#aeb4bc" strokeWidth="2" strokeLinecap="round"/>
      <path d="M28 59 15 76 26 91M122 59 135 76 124 91" fill="none" stroke="#ff453a" strokeWidth="2" strokeOpacity=".7"/>
    </svg>
  );
}

export default function Home() {
  const [activeNav, setActiveNav] = useState('Command');
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState([{ role: 'ULTRON', text: 'Systems initialized. I am standing by, operator.', time: '18:42:08' }]);
  const [missions, setMissions] = useState(initialMissions);
  const [dataMode, setDataMode] = useState<DataMode>('LOADING');
  const [dataMessage, setDataMessage] = useState('Checking protected data connection…');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [notices, setNotices] = useState(initialNotices);
  const [coreState, setCoreState] = useState<'STANDBY' | 'ANALYZING'>('STANDBY');
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showMissionComposer, setShowMissionComposer] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftPriority, setDraftPriority] = useState('normal');
  const [draftDueAt, setDraftDueAt] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [missionProposal, setMissionProposal] = useState<MissionProposal | null>(null);
  const [missionActionBusy, setMissionActionBusy] = useState(false);
  const [missionActionMessage, setMissionActionMessage] = useState('');

  async function loadPersistentMissions(signal?: AbortSignal) {
    setDataMode('LOADING');
    setDataMessage('Checking protected data connection…');
    try {
      const response = await fetch('/api/missions', { method: 'GET', cache: 'no-store', credentials: 'same-origin', signal });
      if (!response.ok) throw new Error(response.status === 401 ? 'Operator session required.' : 'Persistent data is not available.');
      const payload = await response.json() as { workspaces?: Array<{ id: string; name: string }>; missions?: ApiMission[]; tasks?: ApiTask[] };
      if (!Array.isArray(payload.missions) || !Array.isArray(payload.workspaces)) throw new Error('Unexpected data response.');
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
      setWorkspaces(payload.workspaces);
      setSelectedWorkspace((current) => current || payload.workspaces?.[0]?.id || '');
      const mapped: Mission[] = payload.missions.filter((mission) => mission.status !== 'archived').map((mission) => {
        const related = tasks.filter((task) => task.mission_id === mission.id);
        const done = related.filter((task) => task.is_complete).length;
        const progress = mission.status === 'completed' ? 100 : related.length ? Math.round(done / related.length * 100) : 0;
        const priority = mission.priority.toUpperCase();
        const dueDate = mission.due_at ? new Date(mission.due_at) : null;
        return {
          id: mission.id.slice(0, 8).toUpperCase(),
          title: mission.title,
          detail: mission.description || mission.status.toUpperCase(),
          priority: (['CRITICAL', 'HIGH'].includes(priority) ? priority : 'NORMAL') as Mission['priority'],
          progress,
          due: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toLocaleDateString() : 'UNSCHEDULED',
        };
      });
      setMissions(mapped);
      setDataMode('CONNECTED');
      setDataMessage(`${payload.workspaces.length} workspace(s) · ${mapped.length} active mission(s)`);
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setDataMode('PREVIEW');
      setDataMessage(error instanceof Error ? `${error.message} Showing local preview data.` : 'Persistent data unavailable. Showing local preview data.');
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadPersistentMissions(controller.signal);
    return () => controller.abort();
  }, []);

  const completed = useMemo(() => missions.filter((mission) => mission.progress >= 100).length, [missions]);

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setMessages((current) => [
      ...current,
      { role: 'OPERATOR', text: trimmed, time },
      { role: 'ULTRON', text: 'Command received. This interface is currently in local preview mode; no external action has been executed.', time },
    ]);
    setCommand('');
    setCoreState('ANALYZING');
    window.setTimeout(() => setCoreState('STANDBY'), 1300);
  }

  function approveDemoAction() {
    setNotices((current) => current.filter((notice) => notice.id !== 1));
    setMessages((current) => [...current, { role: 'ULTRON', text: 'Preview dismissed. No external action was performed.', time: new Date().toLocaleTimeString('en-US', { hour12: false }) }]);
  }

  function addMission() {
    setMissionProposal(null);
    setMissionActionMessage('');
    setDraftTitle('');
    setDraftDescription('');
    setDraftPriority('normal');
    setDraftDueAt('');
    setShowMissionComposer(true);
  }

  async function proposeMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMissionActionBusy(true);
    setMissionActionMessage('Preparing approval preview…');
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: selectedWorkspace, title: draftTitle, description: draftDescription, priority: draftPriority, dueAt: draftDueAt ? new Date(`${draftDueAt}T23:59:00`).toISOString() : null }),
      });
      const payload = await response.json() as { approval?: MissionProposal; error?: string };
      if (!response.ok || !payload.approval) throw new Error(payload.error || 'Could not prepare approval.');
      setMissionProposal(payload.approval);
      setMissionActionMessage('Review the exact details below. Nothing has been created yet.');
    } catch (error) {
      setMissionActionMessage(error instanceof Error ? error.message : 'Approval preview unavailable.');
    } finally { setMissionActionBusy(false); }
  }

  async function executeMissionProposal() {
    if (!missionProposal) return;
    setMissionActionBusy(true);
    setMissionActionMessage('Executing the approved mission creation…');
    try {
      const response = await fetch(`/api/approvals/${missionProposal.id}/execute`, { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json() as { result?: { status?: string }; error?: string };
      if (!response.ok || payload.result?.status !== 'verified') throw new Error(payload.error || 'Mission creation was not verified. Do not retry until status is checked.');
      setMissionActionMessage('Mission created and verified. Refreshing Mission Control…');
      setMissionProposal(null);
      await loadPersistentMissions();
      setShowAllMissions(true);
      setShowMissionComposer(false);
    } catch (error) {
      setMissionActionMessage(error instanceof Error ? error.message : 'Execution status is uncertain. Check Mission Control before retrying.');
    } finally { setMissionActionBusy(false); }
  }

  const shownMissions = showAllMissions ? missions : missions.slice(0, 3);

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <aside className="sidebar">
        <div className="brand-lockup"><div className="brand-symbol"><span /></div><div><div className="brand-name">ULTRON<span> //</span></div><div className="brand-sub">COMMAND SYSTEMS</div></div></div>
        <div className="side-label">OPERATIONS</div>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.label} className={`nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => setActiveNav(item.label)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.label === 'Activity' && <span className="nav-dot" />}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="operator-card"><div className="operator-avatar">OP</div><div className="operator-copy"><strong>OPERATOR</strong><span>Local session</span></div><span className="online-dot" /></div><div className="build-meta"><span>CORE BUILD</span><span>0.1.0 · PREVIEW</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="breadcrumb"><span>ULTRON</span><i>/</i><strong>{activeNav.toUpperCase()}</strong></div><div className="topbar-right"><div className="system-status"><span className={`online-dot ${dataMode === 'CONNECTED' ? '' : 'offline-dot'}`}/> DATA <b>{dataMode}</b></div><div className="top-divider"/><button className="icon-button" aria-label="Notifications" onClick={() => setActiveNav('Activity')}>♧<span className="notification-pip" /></button><button className="operator-pill" onClick={() => setActiveNav('Settings')}><span className="mini-avatar">OP</span><span>OPERATOR</span><span className="chevron">⌄</span></button></div></header>

        <div className="content-wrap">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> PERSONAL INTELLIGENCE PLATFORM <span className="eyebrow-line"/></div><h1>{activeNav === 'Command' ? <>COMMAND <em>CENTER</em></> : <>{activeNav.toUpperCase()} <em>MODULE</em></>}</h1><p>Strategic overview // All systems are operator-controlled.</p><p className="data-status-line" role="status">{dataMessage}{lastSync ? ` · Last sync ${lastSync}` : ''}</p></div><div className="date-chip"><span className="date-chip-icon">◷</span><div><strong>SESSION ACTIVE</strong><span>LOCAL PREVIEW ENVIRONMENT</span></div></div></div>

          {activeNav !== 'Command' && <div className="module-banner"><span className="module-mark">{navItems.find((item) => item.label === activeNav)?.icon}</span><div><strong>{activeNav} module selected</strong><p>This section is scaffolded for the next implementation stage. No external services are connected.</p></div><button className="subtle-button" onClick={() => setActiveNav('Command')}>Return to command center ↗</button></div>}

          <div className="overview-grid">
            <section className="panel core-panel"><div className="panel-top"><div><span className="section-index">01 / CORE</span><h2>Intelligence Core</h2></div><span className="state-badge"><i />{coreState}</span></div><div className={`core-visual ${coreState === 'ANALYZING' ? 'is-thinking' : ''}`}><div className="core-orbit orbit-a"/><div className="core-orbit orbit-b"/><div className="core-orbit orbit-c"/><div className="core-cross cross-x"/><div className="core-cross cross-y"/><div className="core-halo"/><div className="core-face"><FaceMark /></div><div className="core-label label-left"><span>NEURAL CORE</span><b>ONLINE</b></div><div className="core-label label-right"><span>THREAT LEVEL</span><b className="text-safe">NOMINAL</b></div><div className="core-label label-bottom"><span>COGNITIVE LOAD</span><b>{coreState === 'ANALYZING' ? 'ANALYZING' : '12.8%'} <i className="tiny-bars"><u/><u/><u/><u/><u/></i></b></div></div><div className="core-footer"><div className="core-footer-item"><span>PROCESSING</span><strong>{coreState === 'ANALYZING' ? 'ACTIVE' : 'IDLE'}</strong></div><div className="footer-sep"/><div className="core-footer-item"><span>VOICE LINK</span><strong className="muted-value">NOT CONFIGURED</strong></div><div className="footer-sep"/><div className="core-footer-item"><span>AUTHORITY</span><strong>OPERATOR</strong></div></div></section>

            <section className="panel mission-panel"><div className="panel-top"><div><span className="section-index">02 / MISSION CONTROL</span><h2>Active Missions</h2></div><div className="mission-actions"><button className="text-action" onClick={() => void loadPersistentMissions()} disabled={dataMode === 'LOADING'}>{dataMode === 'LOADING' ? 'SYNCING…' : 'SYNC'} <span>↻</span></button><button className="text-action" onClick={() => setShowAllMissions((value) => !value)}>{showAllMissions ? 'COLLAPSE' : 'VIEW ALL'} <span>↗</span></button></div></div><div className="mission-summary"><div><strong>{missions.length - completed}<small> / {missions.length}</small></strong><span>MISSIONS IN PROGRESS</span></div><div className="summary-ring"><span>{missions.length ? Math.round(missions.reduce((sum, mission) => sum + mission.progress, 0) / missions.length) : 0}%</span></div></div><div className="mission-list">{shownMissions.map((mission) => <article className="mission-row" key={mission.id}><div className="mission-symbol">◈</div><div className="mission-main"><div className="mission-title-row"><strong>{mission.title}</strong><span className={`priority priority-${mission.priority.toLowerCase()}`}>{mission.priority}</span></div><div className="mission-detail">{mission.id} <span>·</span> {mission.detail}</div><div className="progress-track"><div className="progress-fill" style={{ width: `${mission.progress}%` }} /></div></div><div className="mission-end"><span>{mission.due}</span><b>{mission.progress}%</b></div></article>)}</div><button className="add-mission" onClick={addMission}><span>＋</span> CREATE MISSION DRAFT</button></section>

            <section className="panel command-panel"><div className="panel-top"><div><span className="section-index">03 / COMMAND INTERFACE</span><h2>Command Console</h2></div><span className="console-tag"><i/> ENCRYPTED UI · LOCAL</span></div><div className="conversation" aria-live="polite">{messages.slice(-4).map((message, index) => <div className={`message message-${message.role.toLowerCase()}`} key={`${message.time}-${index}-${message.role}`}><div className="message-avatar">{message.role === 'ULTRON' ? 'U' : 'OP'}</div><div className="message-body"><div className="message-meta"><strong>{message.role}</strong><time>{message.time}</time></div><p>{message.text}</p></div></div>)}</div><form className="command-form" onSubmit={submitCommand}><span className="prompt-symbol">›</span><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Enter a command or ask Ultron..." aria-label="Enter command"/><button type="submit" aria-label="Send command">↗</button></form><div className="command-hints"><span>TRY A COMMAND</span><button onClick={() => setCommand('Summarize my active missions')}>MISSION SUMMARY</button><button onClick={() => setCommand('Run a system diagnostic')}>SYSTEM DIAGNOSTIC</button><button onClick={() => setCommand('Plan my next stream')}>STREAM PLANNING</button></div></section>

            <section className="panel status-panel"><div className="panel-top"><div><span className="section-index">04 / TELEMETRY</span><h2>System Diagnostics</h2></div><span className="live-label"><i/> LOCAL</span></div><div className="telemetry-grid"><div className="telemetry-cell"><span>FRONTEND</span><strong>READY</strong><div className="telemetry-meter"><i style={{ width: '92%' }}/></div><small>UI RENDERING</small></div><div className="telemetry-cell"><span>BACKEND</span><strong className="warn-text">OFFLINE</strong><div className="telemetry-meter muted-meter"><i style={{ width: '8%' }}/></div><small>NOT CONNECTED</small></div><div className="telemetry-cell"><span>DATABASE</span><strong className="warn-text">PENDING</strong><div className="telemetry-meter muted-meter"><i style={{ width: '0%' }}/></div><small>SUPABASE · NOT SET</small></div><div className="telemetry-cell"><span>VOICE LINK</span><strong className="warn-text">PENDING</strong><div className="telemetry-meter muted-meter"><i style={{ width: '0%' }}/></div><small>PROVIDER EVALUATION</small></div></div><div className="diagnostic-foot"><span><i className="legend-good"/> Interface operational</span><span><i className="legend-pending"/> Integrations pending</span></div></section>

            <section className="panel alerts-panel"><div className="panel-top"><div><span className="section-index">05 / EVENT CENTER</span><h2>Priority Alerts</h2></div><span className="alert-count">{String(notices.length).padStart(2, '0')}</span></div><div className="alert-list">{notices.length ? notices.map((notice) => <article className="alert-row" key={notice.id}><span className={`alert-indicator tone-${notice.tone}`}>{notice.tone === 'red' ? '!' : notice.tone === 'amber' ? '△' : 'i'}</span><div className="alert-copy"><strong>{notice.title}</strong><p>{notice.detail}</p><span>{notice.time}</span></div>{notice.id === 1 && <button className="review-button" onClick={approveDemoAction}>DISMISS PREVIEW</button>}</article>) : <div className="empty-alerts"><span>✓</span><strong>No pending preview alerts</strong><p>New system events will appear here.</p></div>}</div><button className="all-events" onClick={() => setActiveNav('Activity')}>OPEN EVENT HISTORY <span>↗</span></button></section>
          </div>
          {showMissionComposer && <div role="dialog" aria-modal="true" aria-labelledby="mission-dialog-title" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(3,5,9,.88)', display: 'grid', placeItems: 'center', padding: 20 }}><section className="panel" style={{ width: 'min(620px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24, border: '1px solid rgba(255,65,54,.5)', boxShadow: '0 0 55px rgba(255,48,40,.12)' }}><div className="panel-top"><div><span className="section-index">APPROVAL GATE / MISSION CREATE</span><h2 id="mission-dialog-title">{missionProposal ? 'Review proposed action' : 'Prepare new mission'}</h2></div><button type="button" className="text-action" onClick={() => setShowMissionComposer(false)} disabled={missionActionBusy}>CLOSE ×</button></div>{!missionProposal ? <form onSubmit={proposeMission} style={{ display: 'grid', gap: 14 }}><label>Workspace<select required value={selectedWorkspace} onChange={(e) => setSelectedWorkspace(e.target.value)} disabled={missionActionBusy || workspaces.length === 0} style={fieldStyle}>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label><label>Mission title<input required maxLength={180} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="e.g. Prepare next stream" style={fieldStyle}/></label><label>Description<textarea maxLength={12000} rows={3} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} placeholder="Objective and success criteria" style={fieldStyle}/></label><label>Priority<select value={draftPriority} onChange={(e) => setDraftPriority(e.target.value)} style={fieldStyle}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Due date (optional)<input type="date" value={draftDueAt} onChange={(e) => setDraftDueAt(e.target.value)} style={fieldStyle}/></label><p style={{ color: '#c4c8d0', fontSize: 13 }}>This creates a pending approval only. No mission is written until you review and explicitly approve the next step.</p><button className="add-mission" type="submit" disabled={missionActionBusy || !selectedWorkspace || workspaces.length === 0}>{workspaces.length ? (missionActionBusy ? 'PREPARING…' : 'PREPARE APPROVAL PREVIEW') : 'WORKSPACE CONNECTION REQUIRED'}</button></form> : <div style={{ display: 'grid', gap: 12 }}><p><strong>Action:</strong> {missionProposal.action_summary}</p><p><strong>Workspace:</strong> {workspaces.find((w) => w.id === missionProposal.action_payload.workspace_id)?.name || 'Selected workspace'}</p><p><strong>Title:</strong> {missionProposal.action_payload.title}</p><p><strong>Description:</strong> {missionProposal.action_payload.description || 'None'}</p><p><strong>Priority:</strong> {missionProposal.action_payload.priority.toUpperCase()}</p><p><strong>Due:</strong> {missionProposal.action_payload.due_at ? new Date(missionProposal.action_payload.due_at).toLocaleDateString() : 'Unscheduled'}</p><p style={{ color: '#ffb06a', fontSize: 13 }}>Approval expires {new Date(missionProposal.expires_at).toLocaleTimeString()}. Confirm only if these details are correct.</p><button className="add-mission" type="button" onClick={() => void executeMissionProposal()} disabled={missionActionBusy}>{missionActionBusy ? 'PROCESSING…' : 'APPROVE & CREATE MISSION'}</button><button className="text-action" type="button" onClick={() => setMissionProposal(null)} disabled={missionActionBusy}>BACK TO EDIT</button></div>}{missionActionMessage && <p role="status" style={{ color: '#d5d9df', marginTop: 14 }}>{missionActionMessage}</p>}</section></div>}
          <footer className="page-footer"><span>ULTRON COMMAND SYSTEMS <i>///</i> BUILD 0.1.0</span><span><b/> ALL EXTERNAL ACTIONS DISABLED IN PREVIEW</span><span>OPERATOR AUTHORITY // ABSOLUTE</span></footer>
        </div>
      </section>
    </main>
  );
}
