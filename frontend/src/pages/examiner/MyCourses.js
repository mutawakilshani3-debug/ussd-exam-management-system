import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';

export default function MyCourses() {
  const [courses, setCourses] = useState([]);
  useEffect(() => { api.get('/courses/mine').then((res) => setCourses(res.data.data)); }, []);

  return (
    <DashboardLayout title="My Courses">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Level</th><th>Semester</th></tr></thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}><td className="mono">{c.code}</td><td>{c.name}</td><td>{c.level}</td><td>{c.semester}</td></tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && <div className="empty-state">No courses assigned to you yet.</div>}
      </div>
    </DashboardLayout>
  );
}
