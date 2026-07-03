import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);

  useEffect(() => { api.get('/timetable').then((res) => setTimetable(res.data.data)); }, []);

  const upcoming = timetable.filter((t) => new Date(t.exam_date) >= new Date().setHours(0, 0, 0, 0));

  return (
    <DashboardLayout title={`Welcome, ${user.full_name.split(' ')[0]}`}>
      <div className="stat-grid">
        <StatCard label="Published Exams" value={timetable.length} />
        <StatCard label="Upcoming" value={upcoming.length} />
      </div>
      <div className="card">
        <h3>Your next exams</h3>
        {upcoming.slice(0, 5).map((t) => (
          <div className="docket" key={t.id}>
            <div>
              <div className="docket-code">{t.course_code}</div>
              <div className="docket-title">{t.course_name}</div>
              <div className="docket-meta">{t.venue} · Invigilator: {t.invigilator_name || 'TBA'}</div>
            </div>
            <div className="docket-time">{t.exam_date}<br />{t.start_time} - {t.end_time}</div>
          </div>
        ))}
        {upcoming.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No exams published for your programme yet.</p>}
      </div>
    </DashboardLayout>
  );
}
