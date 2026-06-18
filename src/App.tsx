import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useBlueprintStore } from '@/store/blueprintStore';
import Sidebar from '@/components/Sidebar';
import BlueprintPage from '@/pages/BlueprintPage';
import DiagnosisPage from '@/pages/DiagnosisPage';
import ChecklistPage from '@/pages/ChecklistPage';

function AppLayout() {
  const { loadSampleData, clearAll, floors } = useBlueprintStore();

  const handleLoadSample = () => {
    if (floors.length > 0) {
      if (window.confirm('加载示例蓝图将覆盖当前数据，确定继续吗？')) {
        loadSampleData();
      }
    } else {
      loadSampleData();
    }
  };

  const handleClearAll = () => {
    if (floors.length > 0 && window.confirm('确定要清空所有蓝图数据吗？此操作不可撤销。')) {
      clearAll();
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary">
      <Sidebar onLoadSample={handleLoadSample} onClearAll={handleClearAll} />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to="/blueprint" replace />} />
          <Route path="/blueprint" element={<BlueprintPage />} />
          <Route path="/diagnosis" element={<DiagnosisPage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="*" element={<Navigate to="/blueprint" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
