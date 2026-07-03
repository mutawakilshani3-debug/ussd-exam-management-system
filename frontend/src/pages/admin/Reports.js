import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';

const REPORTS = [
  { type: 'students', label: 'Student List' },
  { type: 'examiners', label: 'Examiner List' },
  { type: 'invigilators', label: 'Invigilator List' },
  { type: 'timetable', label: 'Examination Timetable' },
  { type: 'upcoming-exams', label: 'Upcoming Exams' },
  { type: 'completed-exams', label: 'Completed Exams' },
];

const FORMATS = [
  { format: 'pdf', label: 'PDF' },
  { format: 'excel', label: 'Excel' },
  { format: 'csv', label: 'CSV' },
];

export default function Reports() {
  const download = (type, format) => {
    const token = localStorage.getItem('token');
    const url = `${api.defaults.baseURL}/reports/${type}/${format}`;
    // Use fetch to attach the auth header, then trigger a download.
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Report generation failed.');
        return res.blob();
      })
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${type}.${format === 'excel' ? 'xlsx' : format}`;
        link.click();
      })
      .catch(() => alert('Could not generate report. There may be no data available yet.'));
  };

  return (
    <DashboardLayout title="Reports">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Report</th><th>Download</th></tr></thead>
          <tbody>
            {REPORTS.map((r) => (
              <tr key={r.type}>
                <td>{r.label}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {FORMATS.map((f) => (
                      <button key={f.format} className="btn btn-outline btn-sm" onClick={() => download(r.type, f.format)}>{f.label}</button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
