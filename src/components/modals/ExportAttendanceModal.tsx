import React, { useState } from 'react';
import { X, Download, ArrowRight, ArrowLeft, Calendar, Users, FileText } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

interface ExportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (team: string, month: number, year: number) => Promise<void>;
  isAdmin: boolean;
}

type ExportStep = 'team' | 'date' | 'confirm';

const ExportAttendanceModal: React.FC<ExportAttendanceModalProps> = ({
  isOpen,
  onClose,
  onExport,
  isAdmin
}) => {
  const [step, setStep] = useState<ExportStep>('team');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const teams = [
    { value: 'creative', label: 'Creative Team', icon: '🎨' },
    { value: 'web', label: 'Web Team', icon: '💻' }
  ];

  const resetModal = () => {
    setStep('team');
    setSelectedTeam('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setIsExporting(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleNext = () => {
    if (step === 'team' && selectedTeam) {
      setStep('date');
    } else if (step === 'date') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'date') {
      setStep('team');
    } else if (step === 'confirm') {
      setStep('date');
    }
  };

  const handleExport = async () => {
    if (!selectedTeam || !selectedMonth || !selectedYear) return;
    
    setIsExporting(true);
    try {
      await onExport(selectedTeam, selectedMonth, selectedYear);
      handleClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'team': return 'Select Team';
      case 'date': return 'Select Month & Year';
      case 'confirm': return 'Confirm Export';
      default: return 'Export Attendance';
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Export Attendance Report</h2>
              <p className="text-sm text-gray-500">{getStepTitle()}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            {['team', 'date', 'confirm'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === stepName 
                    ? 'bg-blue-600 text-white' 
                    : index < ['team', 'date', 'confirm'].indexOf(step)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }
                `}>
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`
                    w-16 h-1 mx-2
                    ${index < ['team', 'date', 'confirm'].indexOf(step)
                      ? 'bg-green-600'
                      : 'bg-gray-300'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Team Selection */}
          {step === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700 mb-4">
                <Users className="w-5 h-5" />
                <span className="font-medium">Which team's attendance report would you like to export?</span>
              </div>
              
              <div className="space-y-3">
                {teams.map((team) => (
                  <Card 
                    key={team.value}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedTeam === team.value 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedTeam(team.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{team.icon}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{team.label}</h3>
                          <p className="text-sm text-gray-500">Export attendance data for {team.label.toLowerCase()}</p>
                        </div>
                        {selectedTeam === team.value && (
                          <div className="ml-auto w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date Selection */}
          {step === 'date' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700 mb-4">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Select the month and year for the report</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Month Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>

                {/* Year Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Selected Period</h4>
                    <p className="text-sm text-blue-700">
                      {months[selectedMonth - 1]} {selectedYear} - {teams.find(t => t.value === selectedTeam)?.label}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700 mb-4">
                <Download className="w-5 h-5" />
                <span className="font-medium">Ready to export your attendance report</span>
              </div>

              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Report Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team:</span>
                      <span className="font-medium">{teams.find(t => t.value === selectedTeam)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Period:</span>
                      <span className="font-medium">{months[selectedMonth - 1]} {selectedYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-medium">PDF Report</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs">!</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-900">Report Details</h4>
                    <p className="text-sm text-amber-700">
                      This report will include attendance summaries, check-in/out times, working hours, and detailed employee statistics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex gap-3">
            {step !== 'team' && (
              <Button
                onClick={handleBack}
                variant="secondary"
                icon={ArrowLeft}
                iconPosition="left"
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="secondary"
              disabled={isExporting}
            >
              Cancel
            </Button>
            
            {step !== 'confirm' ? (
              <Button
                onClick={handleNext}
                disabled={step === 'team' && !selectedTeam}
                icon={ArrowRight}
                iconPosition="left"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 text-white"
                icon={Download}
                iconPosition="left"
                isLoading={isExporting}
              >
                {isExporting ? 'Generating...' : 'Download Report'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportAttendanceModal; 