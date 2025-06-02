import React, { useState } from 'react';
import { X, Download, Calendar, User, Users } from 'lucide-react';
import Button from '../ui/Button';
import { format } from 'date-fns';
import { getIndiaDateTime } from '../../utils/timezone';

interface IndividualAttendanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (month: number, year: number) => void;
  employeeName: string;
  teamName: string;
  isExporting: boolean;
}

const IndividualAttendanceExportModal: React.FC<IndividualAttendanceExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  employeeName,
  teamName,
  isExporting
}) => {
  const currentDate = getIndiaDateTime();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleExport = () => {
    onExport(selectedMonth, selectedYear);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Export Individual Report</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Selected Employee Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Selected Employee</span>
            </div>
            <p className="text-blue-800 font-semibold">{employeeName}</p>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">Team: {teamName}</span>
            </div>
          </div>

          {/* Month and Year Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Select Period</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  disabled={isExporting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {months.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  disabled={isExporting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Report will include:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Daily check-in and check-out times</li>
              <li>• Work hours for each day</li>
              <li>• Present and absent days</li>
              <li>• Late check-ins (after 10:00 AM)</li>
              <li>• Sunday markings</li>
              <li>• Monthly summary statistics</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            icon={Download}
            isLoading={isExporting}
          >
            {isExporting ? 'Generating PDF...' : 'Export PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IndividualAttendanceExportModal; 