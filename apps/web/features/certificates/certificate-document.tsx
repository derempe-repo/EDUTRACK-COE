import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type CertificateDocumentProps = {
  certificateNumber: string;
  classTitle: string;
  issuedAt: Date;
  qrDataUrl: string;
  studentName: string;
  verificationUrl: string;
};

const NAVY = "#123044";
const TEAL = "#0e7490";
const BRASS = "#d5a94f";
const FOG = "#f8fafc";
const MUTED = "#64748b";

const styles = StyleSheet.create({
  page: {
    backgroundColor: FOG,
    color: NAVY,
    fontFamily: "Helvetica",
    padding: 18,
  },
  outerFrame: {
    borderColor: NAVY,
    borderWidth: 3,
    height: "100%",
    padding: 7,
  },
  innerFrame: {
    borderColor: BRASS,
    borderWidth: 1,
    height: "100%",
    paddingHorizontal: 34,
    paddingVertical: 24,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  brandCaption: {
    color: TEAL,
    fontSize: 7,
    letterSpacing: 0.8,
    marginTop: 3,
  },
  number: {
    color: MUTED,
    fontSize: 8,
    textAlign: "right",
  },
  seal: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: BRASS,
    borderRadius: 22,
    borderWidth: 1.5,
    height: 44,
    justifyContent: "center",
    marginTop: 13,
    width: 44,
  },
  sealInner: {
    alignItems: "center",
    borderColor: TEAL,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  sealText: {
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  title: {
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 30,
    letterSpacing: 1.8,
    marginTop: 12,
    textAlign: "center",
  },
  titleRule: {
    alignSelf: "center",
    backgroundColor: BRASS,
    height: 1,
    marginTop: 9,
    width: 108,
  },
  subtitle: {
    color: TEAL,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 11,
    textAlign: "center",
  },
  recipientCaption: {
    color: MUTED,
    fontSize: 9,
    marginTop: 15,
    textAlign: "center",
  },
  studentName: {
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 27,
    marginTop: 7,
    textAlign: "center",
  },
  statement: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 1.6,
    marginHorizontal: 58,
    marginTop: 12,
    textAlign: "center",
  },
  classTitle: {
    color: TEAL,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    marginTop: 6,
    textAlign: "center",
  },
  footer: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  footerColumn: {
    width: 210,
  },
  footerLabel: {
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.7,
  },
  footerValue: {
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginTop: 4,
  },
  signatureLine: {
    borderTopColor: BRASS,
    borderTopWidth: 1,
    marginTop: 19,
    paddingTop: 5,
    width: 150,
  },
  signature: {
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  signatureCaption: {
    color: MUTED,
    fontSize: 7,
    marginTop: 3,
  },
  qrWrap: {
    alignItems: "flex-end",
    width: 210,
  },
  qr: {
    height: 62,
    width: 62,
  },
  qrLabel: {
    color: TEAL,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 0.6,
    marginTop: 5,
  },
  qrText: {
    color: MUTED,
    fontSize: 6,
    marginTop: 3,
    maxWidth: 190,
    textAlign: "right",
  },
});

export function CertificateDocument({
  certificateNumber,
  classTitle,
  issuedAt,
  qrDataUrl,
  studentName,
  verificationUrl,
}: CertificateDocumentProps) {
  const issuedAtLabel = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(issuedAt);

  return (
    <Document>
      <Page orientation="landscape" size="A4" style={styles.page}>
        <View style={styles.outerFrame}>
          <View style={styles.innerFrame}>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.brand}>EDUTRACK COE</Text>
                <Text style={styles.brandCaption}>CENTER OF EXCELLENCE DIGITAL LEARNING</Text>
              </View>
              <Text style={styles.number}>NO. {certificateNumber}</Text>
            </View>

            <View style={styles.seal}>
              <View style={styles.sealInner}>
                <Text style={styles.sealText}>COE</Text>
              </View>
            </View>

            <Text style={styles.title}>SERTIFIKAT KELULUSAN</Text>
            <View style={styles.titleRule} />
            <Text style={styles.subtitle}>PENGAKUAN PENYELESAIAN PEMBELAJARAN MODULAR</Text>
            <Text style={styles.recipientCaption}>Diberikan kepada</Text>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.statement}>
              atas keberhasilan menyelesaikan seluruh rangkaian materi, tugas, kuis, dan final exam
              pada kelas
            </Text>
            <Text style={styles.classTitle}>{classTitle}</Text>

            <View style={styles.footer}>
              <View style={styles.footerColumn}>
                <Text style={styles.footerLabel}>DITERBITKAN PADA</Text>
                <Text style={styles.footerValue}>{issuedAtLabel}</Text>
                <View style={styles.signatureLine}>
                  <Text style={styles.signature}>EduTrack COE</Text>
                  <Text style={styles.signatureCaption}>Digital Learning Authority</Text>
                </View>
              </View>

              <View style={styles.qrWrap}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no HTML alt prop */}
                <Image src={qrDataUrl} style={styles.qr} />
                <Text style={styles.qrLabel}>VERIFIKASI KEASLIAN</Text>
                <Text style={styles.qrText}>{verificationUrl}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
