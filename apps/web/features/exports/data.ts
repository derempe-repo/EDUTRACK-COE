import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { certificates, classes, classMembers, grades, profiles } from "@/db/schema";
import { getMahasiswaClassDetail } from "@/features/classes/data";
import { db } from "@/lib/db";

function averageScore(scores: number[]) {
  if (scores.length === 0) {
    return 0;
  }

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export async function getClassReportData(classId: string) {
  const classRows = await db
    .select({
      id: classes.id,
      title: classes.title,
    })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);
  const classItem = classRows[0] ?? null;

  if (!classItem) {
    return null;
  }

  const [studentRows, gradeRows, certificateRows] = await Promise.all([
    db
      .select({
        email: profiles.email,
        id: profiles.id,
        name: profiles.name,
      })
      .from(classMembers)
      .innerJoin(profiles, eq(profiles.id, classMembers.profileId))
      .where(and(eq(classMembers.classId, classId), eq(classMembers.role, "student")))
      .orderBy(asc(profiles.name)),
    db
      .select({
        score: grades.score,
        sourceType: grades.sourceType,
        studentId: grades.studentId,
      })
      .from(grades)
      .where(eq(grades.classId, classId)),
    db
      .select({
        certificateNumber: certificates.certificateNumber,
        status: certificates.status,
        studentId: certificates.studentId,
      })
      .from(certificates)
      .where(eq(certificates.classId, classId)),
  ]);
  const certificateByStudent = new Map(
    certificateRows.map((certificate) => [certificate.studentId, certificate]),
  );

  const students = await Promise.all(
    studentRows.map(async (student) => {
      const detail = await getMahasiswaClassDetail(student.id, classId);
      const studentGrades = gradeRows.filter((grade) => grade.studentId === student.id);
      const finalExamScores = studentGrades
        .filter((grade) => grade.sourceType === "final_exam")
        .map((grade) => grade.score);
      const finalScore = averageScore(
        finalExamScores.length > 0 ? finalExamScores : studentGrades.map((grade) => grade.score),
      );
      const certificate = certificateByStudent.get(student.id) ?? null;

      return {
        certificateNumber: certificate?.certificateNumber ?? "-",
        certificateStatus: certificate?.status ?? "belum tersedia",
        email: student.email,
        finalScore,
        name: student.name,
        progressPercent: detail?.classProgress.percent ?? 0,
      };
    }),
  );

  return {
    classItem,
    generatedAt: new Date(),
    students,
  };
}
