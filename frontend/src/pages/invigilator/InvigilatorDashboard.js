import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import StatusPill from '../../components/StatusPill';
import api from '../../api/axios';

export default function InvigilatorDashboard() {
  const [entries, setEntries] = useState([]);
  useEffect(() => { api.get('/timetable').then((res) => setEntries(res.data.data)); }, []);

  const upcoming = entries.filter((t) => new Date(t.exam_date) >= new Date().setHours(0, 0, 0, 0));

  return (
    <DashboardLayout title="Invigilator Dashboard">
      <div className="stat-grid">
        <StatCard label="Total Assignments" value={entries.length} />
        <StatCard label="Upcoming" value={upcoming.length} />
      </div>
      <div className="card">
        <h3>Upcoming assignments</h3>
        {upcoming.slice(0, 5).map((t) => (
          <div className="docket" key={t.id}>
            <div>
              <div className="docket-code">{t.course_code}</div>
              <div className="docket-title">{t.course_name}</div>
              <div className="docket-meta">{t.venue} · Examiner: {t.examiner_name || 'Unassigned'}</div>
              <div style={{ marginTop: 6 }}><StatusPill status={t.status} /></div>
            </div>
            <div className="docket-time">{t.exam_date}<br />{t.start_time} - {t.end_time}</div>
          </div>
        ))}
        {upcoming.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No upcoming assignments.</p>}
      </div>
    </DashboardLayout>
  );
}
