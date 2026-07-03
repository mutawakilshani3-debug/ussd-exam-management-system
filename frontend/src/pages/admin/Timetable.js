import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatusPill from '../../components/StatusPill';
import api from '../../api/axios';
import { toast } from 'react-toastify';

const EMPTY = { courseId: '', examDate: '', examDay: '', venue: '', startTime: '', endTime: '', examinerId: '', invigilatorId: '' };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Timetable() {
  const [entries, setEntries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [examiners, setExaminers] = useState([]);
  const [invigilators, setInvigilators] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/timetable', { params: { status: statusFilter || undefined } }).then((res) => setEntries(res.data.data));

  useEffect(() => { load(); }, [statusFilter]);  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.get('/courses', { params: { limit: 500 } }).then((res) => setCourses(res.data.data));
    api.get('/examiners', { params: { limit: 500 } }).then((res) => setExaminers(res.data.data));
    api.get('/invigilators', { params: { limit: 500 } }).then((res) => setInvigilators(res.data.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/timetable', form);
      toast.success('Timetable entry created as draft.');
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const publish = async (id) => {
    try {
      await api.patch(`/timetable/${id}/publish`);
      toast.success('Published. Students have been notified.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publish failed.');
    }
  };

  const archive = async (id) => {
    try {
      await api.patch(`/timetable/${id}/archive`);
      toast.success('Archived.');
      load();
    } catch (err) {
      toast.error('Archive failed.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this timetable entry?')) return;
    try {
      await api.delete(`/timetable/${id}`);
      toast.success('Deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <DashboardLayout title="Examination Timetable">
      <div className="toolbar">
        <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button className="btn btn-gold" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Add Timetable Entry'}</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 640 }}>
          <h3>New Timetable Entry</h3>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Course</label>
              <select className="form-control" required value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Exam date</label>
                <input type="date" className="form-control" required value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Day</label>
                <select className="form-control" required value={form.examDay} onChange={(e) => setForm({ ...form, examDay: e.target.value })}>
                  <option value="">Select day</option>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Venue</label>
              <input className="form-control" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start time</label>
                <input type="time" className="form-control" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label>End time</label>
                <input type="time" className="form-control" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Examiner</label>
                <select className="form-control" value={form.examinerId} onChange={(e) => setForm({ ...form, examinerId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {examiners.map((ex) => <option key={ex.id} value={ex.id}>{ex.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Invigilator</label>
                <select className="form-control" value={form.invigilatorId} onChange={(e) => setForm({ ...form, invigilatorId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {invigilators.map((iv) => <option key={iv.id} value={iv.id}>{iv.full_name}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary">Create entry</button>
          </form>
        </div>
      )}

      {entries.map((entry) => (
        <div className="docket" key={entry.id}>
          <div>
            <div className="docket-code">{entry.course_code} · {entry.programme_name} · Level {entry.level}</div>
            <div className="docket-title">{entry.course_name}</div>
            <div className="docket-meta">
              {entry.venue} · Examiner: {entry.examiner_name || 'Unassigned'} · Invigilator: {entry.invigilator_name || 'Unassigned'}
            </div>
            <div style={{ marginTop: 6 }}><StatusPill status={entry.status} /></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="docket-time">{entry.exam_date} · {entry.exam_day}</div>
            <div className="docket-time">{entry.start_time} - {entry.end_time}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {entry.status === 'draft' && <button className="btn btn-gold btn-sm" onClick={() => publish(entry.id)}>Publish</button>}
              {entry.status !== 'archived' && <button className="btn btn-outline btn-sm" onClick={() => archive(entry.id)}>Archive</button>}
              <button className="btn btn-danger btn-sm" onClick={() => remove(entry.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
      {entries.length === 0 && <div className="empty-state"><h3>No timetable entries</h3><p>Add one above to get started.</p></div>}
    </DashboardLayout>
  );
}
