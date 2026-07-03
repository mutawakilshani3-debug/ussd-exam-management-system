import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import StatusPill from '../../components/StatusPill';
import api from '../../api/axios';

export default function ExaminerDashboard() {
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    api.get('/courses/mine').then((res) => setCourses(res.data.data));
    api.get('/timetable').then((res) => setTimetable(res.data.data));
  }, []);

  const upcoming = timetable.filter((t) => new Date(t.exam_date) >= new Date().setHours(0, 0, 0, 0));

  return (
    <DashboardLayout title="Examiner Dashboard">
      <div className="stat-grid">
        <StatCard label="Assigned Courses" value={courses.length} />
        <StatCard label="Scheduled Exams" value={timetable.length} />
        <StatCard label="Upcoming Exams" value={upcoming.length} />
      </div>
      <div className="card">
        <h3>Upcoming exam schedule</h3>
        {upcoming.slice(0, 5).map((t) => (
          <div className="docket" key={t.id}>
            <div>
              <div className="docket-code">{t.course_code}</div>
              <div className="docket-title">{t.course_name}</div>
              <div className="docket-meta">{t.venue}</div>
              <div style={{ marginTop: 6 }}><StatusPill status={t.status} /></div>
            </div>
            <div className="docket-time">{t.exam_date}<br />{t.start_time} - {t.end_time}</div>
          </div>
        ))}
        {upcoming.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No upcoming exams scheduled.</p>}
      </div>
    </DashboardLayout>
  );
}
