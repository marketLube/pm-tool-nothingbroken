import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

// -----------------------------------------------------------------------------
// 1. REGISTER FONTS (using system fonts to avoid loading issues)
// -----------------------------------------------------------------------------
// Commenting out external fonts to avoid loading issues
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     {
//       src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxM.woff2',
//       fontWeight: 'normal',
//     },
//     {
//       src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc-.woff2',
//       fontWeight: 'bold',
//     },
//   ],
// });

// -----------------------------------------------------------------------------
// 2. DEFINE STYLES
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
    color: '#333',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10,
  },
  logo: {
    width: 80,
    height: 80,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  reportTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0A2540',
  },
  subTitle: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    color: '#555',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0A2540',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryItem: {
    flex: 1,
    padding: 6,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#555',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    color: '#0A2540',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#0A2540',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
    padding: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#E0E0E0',
  },
  tableCell: {
    fontSize: 9,
    padding: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#E0E0E0',
  },
  rowOdd: {
    backgroundColor: '#F8F8F8',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    textAlign: 'center',
    color: '#888',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 50,
    fontSize: 8,
    color: '#888',
  },
});

// -----------------------------------------------------------------------------
// 3. PROPS INTERFACES
// -----------------------------------------------------------------------------
interface EmployeeAttendance {
  name: string;
  presentDays: number;
  absentDays: number;
  lateIns: number;
  lateOuts: number;
  averageHours: string; // e.g. "7.5h"
  attendanceRate: string; // e.g. "83.3%"
}

interface AttendanceReportPDFProps {
  companyLogoUrl?: string; // optional: you can pass a URL or local path
  companyName: string;
  teamName: string;
  month: string; // e.g. "June"
  year: number; // e.g. 2025
  workingDays: number; // e.g. 30
  teamSize: number; // e.g. 6
  averageRate: string; // e.g. "85%"
  averageHoursPerDay: string; // e.g. "7.2h"
  employees: EmployeeAttendance[];
  generatedBy: string; // e.g. "Althameem Ali"
  generatedOn: string; // e.g. "June 2, 2025 04:52 AM IST"
}

// -----------------------------------------------------------------------------
// 4. COMPONENT
// -----------------------------------------------------------------------------
const AttendanceReportPDF: React.FC<AttendanceReportPDFProps> = ({
  companyLogoUrl,
  companyName,
  teamName,
  month,
  year,
  workingDays,
  teamSize,
  averageRate,
  averageHoursPerDay,
  employees,
  generatedBy,
  generatedOn,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* --------- HEADER --------- */}
        <View style={styles.headerContainer}>
          {companyLogoUrl ? (
            <Image style={styles.logo} src={companyLogoUrl} />
          ) : null}
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={{ fontSize: 9, color: '#555' }}>
              Project Management System
            </Text>
          </View>
        </View>

        {/* --------- REPORT TITLE --------- */}
        <Text style={styles.reportTitle}>
          {teamName} Attendance Report
        </Text>
        <Text style={styles.subTitle}>
          {month} {year} • {workingDays} Working Days
        </Text>

        {/* --------- TEAM SUMMARY --------- */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Team Summary</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Team Size</Text>
              <Text style={styles.summaryValue}>{teamSize}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Average Attendance Rate</Text>
              <Text style={styles.summaryValue}>{averageRate}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg Hours Per Day</Text>
              <Text style={styles.summaryValue}>{averageHoursPerDay}</Text>
            </View>
          </View>
        </View>

        {/* --------- EMPLOYEE ATTENDANCE TABLE --------- */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Employee Attendance Details</Text>
          <View style={styles.table}>
            {/* Header Row */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>
                Employee Name
              </Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>
                Present
              </Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>
                Absent
              </Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>
                Late In
              </Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>
                Late Out
              </Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>
                Avg Hours
              </Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>
                Attendance Rate
              </Text>
            </View>
            {/* Data Rows */}
            {employees.map((emp, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  idx % 2 === 0 ? styles.rowOdd : {},
                ]}
              >
                <Text style={[styles.tableCell, { width: '25%' }]}>
                  {emp.name}
                </Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>
                  {emp.presentDays}
                </Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>
                  {emp.absentDays}
                </Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>
                  {emp.lateIns}
                </Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>
                  {emp.lateOuts}
                </Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>
                  {emp.averageHours}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {emp.attendanceRate}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* --------- FOOTER --------- */}
        <Text style={styles.footer}>
          Generated by: {generatedBy} | Generated on: {generatedOn}
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
};

export default AttendanceReportPDF; 