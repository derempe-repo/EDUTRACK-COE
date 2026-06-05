import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatAppDateTime } from "@/lib/app-time";

type ClassReportDocumentProps = {
  classTitle: string;
  generatedAt: Date;
  gradeWeights: {
    assignmentWeight: number;
    finalExamWeight: number;
    quizWeight: number;
  };
  students: Array<{
    certificateNumber: string;
    certificateStatus: string;
    email: string;
    assignmentAverage: number;
    finalExamAverage: number;
    finalScore: number;
    name: string;
    progressPercent: number;
    quizAverage: number;
  }>;
};

const styles = StyleSheet.create({
  page: {
    color: "#1e293b",
    fontFamily: "Helvetica",
    fontSize: 8,
    paddingBottom: 30,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: "#123044",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brand: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  brandCaption: {
    color: "#bae6fd",
    fontSize: 6,
    letterSpacing: 0.6,
    marginTop: 3,
  },
  reportLabel: {
    color: "#e7b75b",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 0.8,
  },
  title: {
    color: "#123044",
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 9,
    marginBottom: 14,
    marginTop: 5,
  },
  table: {
    borderColor: "#cbd5e1",
    borderLeftWidth: 1,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: "row",
  },
  header: {
    backgroundColor: "#d9f3f3",
    fontFamily: "Helvetica-Bold",
  },
  cell: {
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    borderRightWidth: 1,
    padding: 5,
  },
  index: {
    width: "4%",
  },
  identity: {
    width: "15%",
  },
  email: {
    width: "19%",
  },
  metric: {
    textAlign: "center",
    width: "8%",
  },
  finalMetric: {
    textAlign: "center",
    width: "9%",
  },
  certificate: {
    width: "21%",
  },
  footer: {
    bottom: 14,
    color: "#64748b",
    flexDirection: "row",
    fontSize: 7,
    justifyContent: "space-between",
    left: 28,
    position: "absolute",
    right: 28,
  },
});

export function ClassReportDocument({
  classTitle,
  generatedAt,
  gradeWeights,
  students,
}: ClassReportDocumentProps) {
  const studentsPerPage = 14;
  const studentPages =
    students.length > 0
      ? Array.from({ length: Math.ceil(students.length / studentsPerPage) }, (_, index) =>
          students.slice(index * studentsPerPage, (index + 1) * studentsPerPage),
        )
      : [[]];

  return (
    <Document>
      {studentPages.map((studentPage, pageIndex) => (
        <Page key={pageIndex} orientation="landscape" size="A4" style={styles.page}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brand}>EDUTRACK COE</Text>
              <Text style={styles.brandCaption}>CENTER OF EXCELLENCE DIGITAL LEARNING</Text>
            </View>
            <Text style={styles.reportLabel}>LAPORAN KELAS</Text>
          </View>
          <Text style={styles.title}>Laporan Kelas - {classTitle}</Text>
          <Text style={styles.subtitle}>
            Dibuat pada {formatAppDateTime(generatedAt)}
            {" - "}
            Bobot nilai: Tugas {gradeWeights.assignmentWeight}% - Kuis {gradeWeights.quizWeight}% - Final Exam {gradeWeights.finalExamWeight}%
          </Text>

          <View style={styles.table}>
            <View style={[styles.row, styles.header]}>
              <Text style={[styles.cell, styles.index]}>No</Text>
              <Text style={[styles.cell, styles.identity]}>Nama</Text>
              <Text style={[styles.cell, styles.email]}>Email</Text>
              <Text style={[styles.cell, styles.metric]}>Progress</Text>
              <Text style={[styles.cell, styles.metric]}>Tugas</Text>
              <Text style={[styles.cell, styles.metric]}>Kuis</Text>
              <Text style={[styles.cell, styles.metric]}>Final Exam</Text>
              <Text style={[styles.cell, styles.finalMetric]}>Nilai Akhir</Text>
              <Text style={[styles.cell, styles.certificate]}>Sertifikat</Text>
            </View>
            {studentPage.map((student, index) => (
              <View key={student.email} style={styles.row} wrap={false}>
                <Text style={[styles.cell, styles.index]}>{pageIndex * studentsPerPage + index + 1}</Text>
                <Text style={[styles.cell, styles.identity]}>{student.name}</Text>
                <Text style={[styles.cell, styles.email]}>{student.email}</Text>
                <Text style={[styles.cell, styles.metric]}>{student.progressPercent}%</Text>
                <Text style={[styles.cell, styles.metric]}>{student.assignmentAverage}</Text>
                <Text style={[styles.cell, styles.metric]}>{student.quizAverage}</Text>
                <Text style={[styles.cell, styles.metric]}>{student.finalExamAverage}</Text>
                <Text style={[styles.cell, styles.finalMetric]}>{student.finalScore}</Text>
                <Text style={[styles.cell, styles.certificate]}>
                  {student.certificateStatus} - {student.certificateNumber}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.footer} fixed>
            <Text>EduTrack COE - Laporan kelas internal</Text>
            <Text
              render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
            />
          </View>
        </Page>
      ))}
    </Document>
  );
}
