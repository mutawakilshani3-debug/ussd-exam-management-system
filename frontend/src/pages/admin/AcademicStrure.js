import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { toast } from 'react-toastify';

export default function AcademicStructure() {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);

  const [facultyName, setFacultyName] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptFacultyId, setDeptFacultyId] = useState('');
  const [progName, setProgName] = useState('');
  const [progDeptId, setProgDeptId] = useState('');

  const loadAll = () => {
    api.get('/academic/faculties').then((res) => setFaculties(res.data.data));
    api.get('/academic/departments').then((res) => setDepartments(res.data.data));
    api.get('/academic/programmes').then((res) => setProgrammes(res.data.data));
  };

  useEffect(loadAll, []);

  const addFaculty = async (e) => {
    e.preventDefault();
    if (!facultyName.trim()) return;
    try {
      await api.post('/academic/faculties', { name: facultyName.trim() });
      toast.success('Faculty added.');
      setFacultyName('');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add faculty.');
    }
  };

  const addDepartment = async (e) => {
    e.preventDefault();
    if (!deptName.trim() || !deptFacultyId) return toast.error('Choose a faculty and enter a department name.');
    try {
      await api.post('/academic/departments', { name: deptName.trim(), facultyId: deptFacultyId });
      toast.success('Department added.');
      setDeptName('');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add department.');
    }
  };

  const addProgramme = async (e) => {
    e.preventDefault();
    if (!progName.trim() || !progDeptId) return toast.error('Choose a department and enter a programme name.');
    try {
      await api.post('/academic/programmes', { name: progName.trim(), departmentId: progDeptId });
      toast.success('Programme added.');
      setProgName('');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add programme.');
    }
  };

  return (
    <DashboardLayout title="Academic Structure">
      <p style={{ color: 'var(--ink-soft)', marginTop: -8, marginBottom: 24 }}>
        Set up Faculties → Departments → Programmes, in that order. Programmes are what you'll assign
        to students and courses elsewhere in the system.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Faculties */}
        <div className="card">
          <h3>Faculties</h3>
          <form onSubmit={addFaculty} style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>New faculty name</label>
              <input className="form-control" value={facultyName} onChange={(e) => setFacultyName(e.target.value)} placeholder="e.g. Faculty of Engineering" />
            </div>
            <button className="btn btn-gold btn-sm">+ Add Faculty</button>
          </form>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {faculties.map((f) => (
              <li key={f.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>{f.name}</li>
            ))}
            {faculties.length === 0 && <li style={{ color: 'var(--ink-soft)' }}>No faculties yet.</li>}
          </ul>
        </div>

        {/* Departments */}
        <div className="card">
          <h3>Departments</h3>
          <form onSubmit={addDepartment} style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>Faculty</label>
              <select className="form-control" value={deptFacultyId} onChange={(e) => setDeptFacultyId(e.target.value)}>
                <option value="">Select faculty</option>
                {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>New department name</label>
              <input className="form-control" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Department of Computer Science" />
            </div>
            <button className="btn btn-gold btn-sm">+ Add Department</button>
          </form>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {departments.map((d) => (
              <li key={d.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                {d.name}
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{d.faculty_name}</div>
              </li>
            ))}
            {departments.length === 0 && <li style={{ color: 'var(--ink-soft)' }}>No departments yet.</li>}
          </ul>
        </div>

        {/* Programmes */}
        <div className="card">
          <h3>Programmes</h3>
          <form onSubmit={addProgramme} style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>Department</label>
              <select className="form-control" value={progDeptId} onChange={(e) => setProgDeptId(e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>New programme name</label>
              <input className="form-control" value={progName} onChange={(e) => setProgName(e.target.value)} placeholder="e.g. Diploma in Electrical Engineering" />
            </div>
            <button className="btn btn-gold btn-sm">+ Add Programme</button>
          </form>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {programmes.map((p) => (
              <li key={p.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                {p.name}
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{p.department_name}</div>
              </li>
            ))}
            {programmes.length === 0 && <li style={{ color: 'var(--ink-soft)' }}>No programmes yet.</li>}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
