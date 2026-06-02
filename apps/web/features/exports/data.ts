import "server-only";

import { and, asc, eq } from "drizzle-orm";

import {
  assignments,
  certificates,
  classes,
  classMembers,
  grades,
  moduleSteps,
  modules,
  profiles,
  submissions,
} from "@/db/schema";
import { getMahasiswaClassDetail } from "@/features/classes/data";
import { calculateWeightedClassScore } from "@/features/grades/class-score";
import { db } from "@/lib/db";

export async function getClassReportData(classId: string) {
  const classRows = await db
    .select({
      id: classes.id,
      title: classes.title,
      assignmentWeight: classes.assignmentWeight,
      quizWeight: classes.quizWeight,
      finalExamWeight: classes.finalExamWeight,
    })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);
  const classItem = classRows[0] ?? null;

  if (!classItem) {
    return null;
  }

  const [studentRows, gradeRows, submissionRows, certificateRows] = await Promise.all([
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
        maxScore: grades.maxScore,
        sourceType: grades.sourceType,
        studentId: grades.studentId,
      })
      .from(grades)
      .where(eq(grades.classId, classId)),
    db
      .select({
        maxScore: assignments.maxScore,
        score: submissions.score,
        studentId: submissions.studentId,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(and(eq(modules.classId, classId), eq(submissions.status, "accepted"))),
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
      const score = calculateWeightedClassScore({
        assignmentScores: submissionRows
          .filter((submission) => submission.studentId === student.id && submission.score !== null)
          .map((submission) => ({ maxScore: submission.maxScore, score: Number(submission.score) })),
        assignmentWeight: classItem.assignmentWeight,
        finalExamScores: studentGrades
          .filter((grade) => grade.sourceType === "final_exam")
          .map((grade) => ({ maxScore: grade.maxScore, score: grade.score })),
        finalExamWeight: classItem.finalExamWeight,
        quizScores: studentGrades
          .filter((grade) => grade.sourceType === "quiz")
          .map((grade) => ({ maxScore: grade.maxScore, score: grade.score })),
        quizWeight: classItem.quizWeight,
      });
      const certificate = certificateByStudent.get(student.id) ?? null;

      return {
        assignmentAverage: score.assignmentAverage,
        certificateNumber: certificate?.certificateNumber ?? "-",
        certificateStatus: certificate?.status ?? "belum tersedia",
        email: student.email,
        finalExamAverage: score.finalExamAverage,
        finalScore: score.finalScore,
        name: student.name,
        progressPercent: detail?.classProgress.percent ?? 0,
        quizAverage: score.quizAverage,
      };
    }),
  );

  return {
    classItem,
    generatedAt: new Date(),
    students,
  };
}
