import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, parseISO } from 'date-fns';

// Register Helvetica fonts for better compatibility
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ]
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  employeeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  employeeDetails: {
    flex: 1,
  },
  periodInfo: {
    textAlign: 'right',
  },
  label: {
    fontWeight: 'bold',
    color: '#374151',
  },
  value: {
    color: '#6b7280',
    marginLeft: 5,
  },
  summarySection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 5,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '25%',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tableSection: {
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowSunday: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fef3c7',
  },
  tableRowAbsent: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fecaca',
  },
  tableRowLate: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fed7aa',
  },
  colDate: { width: '15%', fontSize: 9 },
  colDay: { width: '12%', fontSize: 9 },
  colCheckIn: { width: '15%', fontSize: 9 },
  colCheckOut: { width: '15%', fontSize: 9 },
  colHours: { width: '12%', fontSize: 9 },
  colStatus: { width: '15%', fontSize: 9 },
  colNotes: { width: '16%', fontSize: 9 },
  headerText: {
    fontWeight: 'bold',
    color: '#374151',
  },
  cellText: {
    color: '#4b5563',
  },
  sundayText: {
    color: '#92400e',
  },
  absentText: {
    color: '#dc2626',
  },
  lateText: {
    color: '#ea580c',
  },
  presentText: {
    color: '#059669',
  },
  legend: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 5,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    width: '25%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    marginRight: 5,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 9,
    color: '#6b7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
});

interface AttendanceRecord {
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: number;
  isAbsent: boolean;
}

interface IndividualAttendanceReportPDFProps {
  employeeName: string;
  teamName: string;
  month: number;
  year: number;
  attendanceData: AttendanceRecord[];
}

const IndividualAttendanceReportPDF: React.FC<IndividualAttendanceReportPDFProps> = ({
  employeeName,
  teamName,
  month,
  year,
  attendanceData
}) => {
  // Generate all days in the month
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Create attendance map for quick lookup
  const attendanceMap = new Map();
  attendanceData.forEach(record => {
    attendanceMap.set(record.date, record);
  });

  // Calculate statistics
  const totalDays = allDays.length;
  const workingDays = allDays.filter(day => getDay(day) !== 0).length; // Excluding Sundays
  const presentDays = attendanceData.filter(record => !record.isAbsent && record.checkInTime).length;
  const absentDays = attendanceData.filter(record => record.isAbsent).length;
  const totalHours = attendanceData.reduce((sum, record) => sum + (record.totalHours || 0), 0);
  const averageHours = presentDays > 0 ? (totalHours / presentDays) : 0;
  
  // Calculate late check-ins (after 10:00 AM)
  const lateCheckIns = attendanceData.filter(record => {
    if (!record.checkInTime) return false;
    const checkInTime = record.checkInTime.split(':');
    const hours = parseInt(checkInTime[0]);
    const minutes = parseInt(checkInTime[1]);
    return hours > 10 || (hours === 10 && minutes > 0);
  }).length;

  const monthName = format(new Date(year, month - 1), 'MMMM');

  const getDayStatus = (day: Date, attendance?: AttendanceRecord) => {
    const dayOfWeek = getDay(day);
    
    if (dayOfWeek === 0) return 'Sunday';
    if (!attendance) return 'No Data';
    if (attendance.isAbsent) return 'Absent';
    if (!attendance.checkInTime) return 'Absent';
    
    // Check if late (after 10:00 AM)
    const checkInTime = attendance.checkInTime.split(':');
    const hours = parseInt(checkInTime[0]);
    const minutes = parseInt(checkInTime[1]);
    const isLate = hours > 10 || (hours === 10 && minutes > 0);
    
    if (isLate) return 'Late';
    return 'Present';
  };

  const getRowStyle = (status: string) => {
    switch (status) {
      case 'Sunday': return styles.tableRowSunday;
      case 'Absent': return styles.tableRowAbsent;
      case 'Late': return styles.tableRowLate;
      default: return styles.tableRow;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Sunday': return styles.sundayText;
      case 'Absent': return styles.absentText;
      case 'Late': return styles.lateText;
      case 'Present': return styles.presentText;
      default: return styles.cellText;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>Marketlube</Text>
          <Text style={styles.reportTitle}>Individual Attendance Report</Text>
          
          <View style={styles.employeeInfo}>
            <View style={styles.employeeDetails}>
              <Text>
                <Text style={styles.label}>Employee:</Text>
                <Text style={styles.value}>{employeeName}</Text>
              </Text>
              <Text>
                <Text style={styles.label}>Team:</Text>
                <Text style={styles.value}>{teamName}</Text>
              </Text>
            </View>
            <View style={styles.periodInfo}>
              <Text>
                <Text style={styles.label}>Period:</Text>
                <Text style={styles.value}>{monthName} {year}</Text>
              </Text>
              <Text>
                <Text style={styles.label}>Generated:</Text>
                <Text style={styles.value}>{format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Monthly Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Days</Text>
              <Text style={styles.summaryValue}>{totalDays}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Working Days</Text>
              <Text style={styles.summaryValue}>{workingDays}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Present Days</Text>
              <Text style={styles.summaryValue}>{presentDays}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Absent Days</Text>
              <Text style={styles.summaryValue}>{absentDays}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{totalHours.toFixed(1)}h</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Average Hours</Text>
              <Text style={styles.summaryValue}>{averageHours.toFixed(1)}h</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Late Check-ins</Text>
              <Text style={styles.summaryValue}>{lateCheckIns}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Attendance %</Text>
              <Text style={styles.summaryValue}>{workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(1) : 0}%</Text>
            </View>
          </View>
        </View>

        {/* Daily Attendance Table */}
        <View style={styles.tableSection}>
          <Text style={styles.tableTitle}>Daily Attendance Details</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.headerText]}>Date</Text>
            <Text style={[styles.colDay, styles.headerText]}>Day</Text>
            <Text style={[styles.colCheckIn, styles.headerText]}>Check In</Text>
            <Text style={[styles.colCheckOut, styles.headerText]}>Check Out</Text>
            <Text style={[styles.colHours, styles.headerText]}>Hours</Text>
            <Text style={[styles.colStatus, styles.headerText]}>Status</Text>
            <Text style={[styles.colNotes, styles.headerText]}>Notes</Text>
          </View>

          {/* Table Rows */}
          {allDays.map((day, index) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const attendance = attendanceMap.get(dateStr);
            const status = getDayStatus(day, attendance);
            const dayName = format(day, 'EEE');
            
            let notes = '';
            if (status === 'Sunday') notes = 'Weekend';
            else if (status === 'Late') notes = 'Late arrival';
            else if (status === 'Absent') notes = 'Not present';

            return (
              <View key={index} style={getRowStyle(status)}>
                <Text style={[styles.colDate, styles.cellText]}>
                  {format(day, 'dd/MM')}
                </Text>
                <Text style={[styles.colDay, dayName === 'Sun' ? styles.sundayText : styles.cellText]}>
                  {dayName}
                </Text>
                <Text style={[styles.colCheckIn, styles.cellText]}>
                  {attendance?.checkInTime || '-'}
                </Text>
                <Text style={[styles.colCheckOut, styles.cellText]}>
                  {attendance?.checkOutTime || '-'}
                </Text>
                <Text style={[styles.colHours, styles.cellText]}>
                  {attendance?.totalHours ? `${attendance.totalHours.toFixed(1)}h` : '-'}
                </Text>
                <Text style={[styles.colStatus, getStatusText(status)]}>
                  {status}
                </Text>
                <Text style={[styles.colNotes, styles.cellText]}>
                  {notes}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#ffffff' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fed7aa' }]} />
              <Text style={styles.legendText}>Late Check-in</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fecaca' }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fef3c7' }]} />
              <Text style={styles.legendText}>Sunday</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This report was automatically generated by Marketlube PM Tool - Individual Attendance Report for {employeeName}
        </Text>
      </Page>
    </Document>
  );
};

export default IndividualAttendanceReportPDF; 