import { AnimatePresence, motion } from 'motion/react';
import { NavBar, Sidebar } from './components/layout/NavBar';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FleetPage } from './pages/FleetPage';
import { useAppStore } from './store/useAppStore';
import { MOCK_SUMMARY } from './data/mockData';


export default function App() {
  const { currentPage, summary } = useAppStore();

  const busCount = summary?.buses_reporting ?? MOCK_SUMMARY.buses_reporting;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':  return <DashboardPage />;
      case 'incidents':  return <IncidentsPage />;
      case 'analytics':  return <AnalyticsPage />;
      case 'fleet':      return <FleetPage />;
    }
  };

  return (
    <div className="flex h-full bg-[#000000] dot-matrix text-white overflow-hidden relative">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 relative">
        <NavBar busCount={busCount} />

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full w-full absolute inset-0 flex"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
