import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type ClassReportDocumentProps = {
  classTitle: string;
  generatedAt: Date;
  students: Array<{
    certificateNumber: string;
    certificateStatus: string;
    email: string;
    finalScore: number;
    name: string;
    progressPercent: number;
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
    width: "5%",
  },
  identity: {
    width: "25%",
  },
  email: {
    width: "24%",
  },
  metric: {
    textAlign: "center",
    width: "11%",
  },
  certificate: {
    width: "24%",
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
  students,
}: ClassReportDocumentProps) {
  return (
    <Document>
      <Page orientation="landscape" size="A4" style={styles.page}>
        <View style={styles.topBar} fixed>
          <View>
            <Text style={styles.brand}>EDUTRACK COE</Text>
            <Text style={styles.brandCaption}>CENTER OF EXCELLENCE DIGITAL LEARNING</Text>
          </View>
          <Text style={styles.reportLabel}>LAPORAN KELAS</Text>
        </View>
        <Text style={styles.title}>Laporan Kelas - {classTitle}</Text>
        <Text style={styles.subtitle}>
          Dibuat pada {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(generatedAt)}
        </Text>

        <View style={styles.table}>
          <View style={[styles.row, styles.header]}>
            <Text style={[styles.cell, styles.index]}>No</Text>
            <Text style={[styles.cell, styles.identity]}>Nama</Text>
            <Text style={[styles.cell, styles.email]}>Email</Text>
            <Text style={[styles.cell, styles.metric]}>Progress</Text>
            <Text style={[styles.cell, styles.metric]}>Nilai</Text>
            <Text style={[styles.cell, styles.certificate]}>Sertifikat</Text>
          </View>
          {students.map((student, index) => (
            <View key={student.email} style={styles.row}>
              <Text style={[styles.cell, styles.index]}>{index + 1}</Text>
              <Text style={[styles.cell, styles.identity]}>{student.name}</Text>
              <Text style={[styles.cell, styles.email]}>{student.email}</Text>
              <Text style={[styles.cell, styles.metric]}>{student.progressPercent}%</Text>
              <Text style={[styles.cell, styles.metric]}>{student.finalScore}</Text>
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
    </Document>
  );
}
