import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-secondary-800">
      {/* Sidebar */}
      <div className="lg:relative fixed inset-y-0 left-0 z-30 w-52 transform lg:translate-x-0">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:pl-16">
        <div className="sticky top-0 z-10">
          <Header />
        </div>
        
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 py-5 max-w-[1800px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;