import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ title, children }) {
  return (
    <div className="app-shell">
      <Sidebar open />
      <main className="main-content">
        <Topbar title={title} />
        {children}
      </main>
    </div>
  );
}
