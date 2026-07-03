import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatusPill from '../../components/StatusPill';
import api from '../../api/axios';

export default function Assignments() {
  const [entries, setEntries] = useState([]);
  useEffect(() => { api.get('/timetable').then((res) => setEntries(res.data.data)); }, []);

  return (
    <DashboardLayout title="My Assignments">
      {entries.map((entry) => (
        <div className="docket" key={entry.id}>
          <div>
            <div className="docket-code">{entry.course_code}</div>
            <div className="docket-title">{entry.course_name}</div>
            <div className="docket-meta">{entry.venue} · Examiner: {entry.examiner_name || 'Unassigned'}</div>
            <div style={{ marginTop: 6 }}><StatusPill status={entry.status} /></div>
          </div>
          <div className="docket-time">{entry.exam_date}<br />{entry.start_time} - {entry.end_time}</div>
        </div>
      ))}
      {entries.length === 0 && <div className="empty-state">No assignments yet.</div>}
    </DashboardLayout>
  );
}
