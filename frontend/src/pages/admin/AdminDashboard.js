import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import api from '../../api/axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function barData(rows, labelKey, valueKey, color) {
  return {
    labels: rows.map((r) => r[labelKey]),
    datasets: [{ label: 'Total', data: rows.map((r) => r[valueKey]), backgroundColor: color }],
  };
}

const chartOptions = { responsive: true, plugins: { legend: { display: false } } };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/admin').then((res) => setStats(res.data.data));
  }, []);

  if (!stats) return <DashboardLayout title="Dashboard">Loading...</DashboardLayout>;

  const { totals, recentActivity, charts } = stats;

  return (
    <DashboardLayout title="Administrator Dashboard">
      <div className="stat-grid">
        <StatCard label="Total Students" value={totals.students} />
        <StatCard label="Total Examiners" value={totals.examiners} />
        <StatCard label="Total Invigilators" value={totals.invigilators} />
        <StatCard label="Total Courses" value={totals.courses} />
        <StatCard label="Exam Timetables" value={totals.timetables} />
        <StatCard label="Upcoming Exams" value={totals.upcomingExams} />
        <StatCard label="Today's Exams" value={totals.todaysExams} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h3>Students by Programme</h3>
          {charts.studentsByProgramme.length > 0
            ? <Bar options={chartOptions} data={barData(charts.studentsByProgramme, 'programme', 'total', '#0B2545')} />
            : <p style={{ color: 'var(--ink-soft)' }}>No student data yet.</p>}
        </div>
        <div className="card">
          <h3>Exams by Day</h3>
          {charts.examsByDay.length > 0
            ? <Bar options={chartOptions} data={barData(charts.examsByDay, 'exam_day', 'total', '#C99A3E')} />
            : <p style={{ color: 'var(--ink-soft)' }}>No timetable data yet.</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h3>Invigilator Workload</h3>
          {charts.invigilatorWorkload.length > 0
            ? <Bar options={chartOptions} data={barData(charts.invigilatorWorkload, 'full_name', 'total', '#1B3E78')} />
            : <p style={{ color: 'var(--ink-soft)' }}>No assignments yet.</p>}
        </div>
        <div className="card">
          <h3>Examiner Workload</h3>
          {charts.examinerWorkload.length > 0
            ? <Bar options={chartOptions} data={barData(charts.examinerWorkload, 'full_name', 'total', '#A87C1F')} />
            : <p style={{ color: 'var(--ink-soft)' }}>No assignments yet.</p>}
        </div>
      </div>

      <div className="card">
        <h3>Recent Activity</h3>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table className="data-table">
            <thead><tr><th>User</th><th>Action</th><th>Details</th><th>When</th></tr></thead>
            <tbody>
              {recentActivity.map((a) => (
                <tr key={a.id}>
                  <td>{a.full_name || 'System'}</td>
                  <td>{a.action}</td>
                  <td>{a.details}</td>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
