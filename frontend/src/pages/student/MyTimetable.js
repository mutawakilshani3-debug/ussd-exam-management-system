import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';

export default function MyTimetable() {
  const [entries, setEntries] = useState([]);
  useEffect(() => { api.get('/timetable').then((res) => setEntries(res.data.data)); }, []);

  return (
    <DashboardLayout title="Exam Timetable">
      {entries.map((entry) => (
        <div className="docket" key={entry.id}>
          <div>
            <div className="docket-code">{entry.course_code}</div>
            <div className="docket-title">{entry.course_name}</div>
            <div className="docket-meta">{entry.venue} · Invigilator: {entry.invigilator_name || 'TBA'}</div>
          </div>
          <div className="docket-time">{entry.exam_date}<br />{entry.exam_day}<br />{entry.start_time} - {entry.end_time}</div>
        </div>
      ))}
      {entries.length === 0 && <div className="empty-state">No exams have been published for your programme and level yet.</div>}
    </DashboardLayout>
  );
}
