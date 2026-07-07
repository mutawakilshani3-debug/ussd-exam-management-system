import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';

const TOGGLES = [
  {
    key: 'show_register_link',
    label: 'Show "Create an account" link',
    description: 'Lets students self-register from the sign-in page.',
  },
  {
    key: 'show_check_exam_link',
    label: 'Show "Check exam details without signing in" link',
    description: 'Public course-code exam checker, no login required.',
  },
  {
    key: 'show_timetable_link',
    label: 'Show "View full exam timetable" link',
    description: 'Public browsable list of all published exams.',
  },
];

export default function SiteSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setSettings(res.data.settings))
      .catch(() => toast.error('Failed to load settings.'));
  }, []);

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    const updated = { ...settings, [key]: newValue };
    setSettings(updated); // optimistic update
    setSaving(true);
    try {
      await api.put('/settings', { [key]: newValue });
      toast.success('Setting updated.');
    } catch (err) {
      setSettings(settings); // revert on failure
      toast.error(err.response?.data?.message || 'Failed to update setting.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <DashboardLayout title="Site Settings">Loading...</DashboardLayout>;

  return (
    <DashboardLayout title="Site Settings">
      <div className="card">
        <h3>Sign-in Page Links</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 20 }}>
          Control which links appear below the sign-in form for public visitors.
        </p>

        {TOGGLES.map((t) => (
          <div
            key={t.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ maxWidth: 480 }}>
              <div style={{ fontWeight: 600 }}>{t.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{t.description}</div>
            </div>

            <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 26 }}>
              <input
                type="checkbox"
                checked={settings[t.key]}
                onChange={() => handleToggle(t.key)}
                disabled={saving}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: settings[t.key] ? 'var(--navy-900)' : '#ccc',
                  borderRadius: 26,
                  transition: '0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    height: 20,
                    width: 20,
                    left: settings[t.key] ? 23 : 3,
                    bottom: 3,
                    background: '#fff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }}
                />
              </span>
            </label>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
