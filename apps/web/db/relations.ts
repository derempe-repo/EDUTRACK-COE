import { relations } from "drizzle-orm";

import {
  assignments,
  certificateVerifications,
  certificates,
  classes,
  classMembers,
  examModeEvents,
  exports,
  grades,
  materials,
  materialReads,
  moduleProgress,
  moduleSteps,
  modules,
  notifications,
  plagiarismChecks,
  plagiarismMatches,
  plagiarismOverrides,
  profiles,
  questionOptions,
  questions,
  quizAnswers,
  quizAttemptQuestions,
  quizAttempts,
  quizzes,
  submissions,
  systemSettings,
} from "@/db/schema";

export const profileRelations = relations(profiles, ({ many }) => ({
  updatedSettings: many(systemSettings),
  createdClasses: many(classes),
  classMemberships: many(classMembers),
  createdMaterials: many(materials),
  materialReads: many(materialReads),
  createdAssignments: many(assignments),
  submissions: many(submissions),
  plagiarismOverrides: many(plagiarismOverrides),
  progress: many(moduleProgress),
  notifications: many(notifications),
  createdQuizzes: many(quizzes),
  createdQuestions: many(questions),
  quizAttempts: many(quizAttempts),
  grades: many(grades),
  certificates: many(certificates),
  requestedExports: many(exports),
}));

export const systemSettingRelations = relations(systemSettings, ({ one }) => ({
  updater: one(profiles, {
    fields: [systemSettings.updatedBy],
    references: [profiles.id],
  }),
}));

export const classRelations = relations(classes, ({ one, many }) => ({
  creator: one(profiles, {
    fields: [classes.createdBy],
    references: [profiles.id],
  }),
  members: many(classMembers),
  modules: many(modules),
  certificates: many(certificates),
  exports: many(exports),
}));

export const classMemberRelations = relations(classMembers, ({ one }) => ({
  class: one(classes, {
    fields: [classMembers.classId],
    references: [classes.id],
  }),
  profile: one(profiles, {
    fields: [classMembers.profileId],
    references: [profiles.id],
  }),
}));

export const moduleRelations = relations(modules, ({ one, many }) => ({
  class: one(classes, {
    fields: [modules.classId],
    references: [classes.id],
  }),
  steps: many(moduleSteps),
  quizzes: many(quizzes),
}));

export const moduleStepRelations = relations(moduleSteps, ({ one, many }) => ({
  module: one(modules, {
    fields: [moduleSteps.moduleId],
    references: [modules.id],
  }),
  materials: many(materials),
  assignments: many(assignments),
  quizzes: many(quizzes),
  questions: many(questions),
  progress: many(moduleProgress),
}));

export const materialRelations = relations(materials, ({ one, many }) => ({
  step: one(moduleSteps, {
    fields: [materials.moduleStepId],
    references: [moduleSteps.id],
  }),
  creator: one(profiles, {
    fields: [materials.createdBy],
    references: [profiles.id],
  }),
  reads: many(materialReads),
}));

export const materialReadRelations = relations(materialReads, ({ one }) => ({
  material: one(materials, {
    fields: [materialReads.materialId],
    references: [materials.id],
  }),
  student: one(profiles, {
    fields: [materialReads.studentId],
    references: [profiles.id],
  }),
}));

export const assignmentRelations = relations(assignments, ({ one, many }) => ({
  step: one(moduleSteps, {
    fields: [assignments.moduleStepId],
    references: [moduleSteps.id],
  }),
  creator: one(profiles, {
    fields: [assignments.createdBy],
    references: [profiles.id],
  }),
  submissions: many(submissions),
}));

export const quizRelations = relations(quizzes, ({ one, many }) => ({
  step: one(moduleSteps, {
    fields: [quizzes.moduleStepId],
    references: [moduleSteps.id],
  }),
  module: one(modules, {
    fields: [quizzes.moduleId],
    references: [modules.id],
  }),
  creator: one(profiles, {
    fields: [quizzes.createdBy],
    references: [profiles.id],
  }),
  attempts: many(quizAttempts),
}));

export const questionRelations = relations(questions, ({ one, many }) => ({
  step: one(moduleSteps, {
    fields: [questions.moduleStepId],
    references: [moduleSteps.id],
  }),
  creator: one(profiles, {
    fields: [questions.createdBy],
    references: [profiles.id],
  }),
  options: many(questionOptions),
  attemptQuestions: many(quizAttemptQuestions),
}));

export const questionOptionRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, {
    fields: [questionOptions.questionId],
    references: [questions.id],
  }),
}));

export const quizAttemptRelations = relations(quizAttempts, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  student: one(profiles, {
    fields: [quizAttempts.studentId],
    references: [profiles.id],
  }),
  questions: many(quizAttemptQuestions),
  events: many(examModeEvents),
}));

export const quizAttemptQuestionRelations = relations(quizAttemptQuestions, ({ one, many }) => ({
  attempt: one(quizAttempts, {
    fields: [quizAttemptQuestions.attemptId],
    references: [quizAttempts.id],
  }),
  question: one(questions, {
    fields: [quizAttemptQuestions.questionId],
    references: [questions.id],
  }),
  answers: many(quizAnswers),
}));

export const quizAnswerRelations = relations(quizAnswers, ({ one }) => ({
  attemptQuestion: one(quizAttemptQuestions, {
    fields: [quizAnswers.attemptQuestionId],
    references: [quizAttemptQuestions.id],
  }),
  selectedOption: one(questionOptions, {
    fields: [quizAnswers.selectedOptionId],
    references: [questionOptions.id],
  }),
}));

export const gradeRelations = relations(grades, ({ one }) => ({
  class: one(classes, {
    fields: [grades.classId],
    references: [classes.id],
  }),
  student: one(profiles, {
    fields: [grades.studentId],
    references: [profiles.id],
  }),
}));

export const examModeEventRelations = relations(examModeEvents, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [examModeEvents.attemptId],
    references: [quizAttempts.id],
  }),
  student: one(profiles, {
    fields: [examModeEvents.studentId],
    references: [profiles.id],
  }),
}));

export const submissionRelations = relations(submissions, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(profiles, {
    fields: [submissions.studentId],
    references: [profiles.id],
  }),
  reviewer: one(profiles, {
    fields: [submissions.reviewedBy],
    references: [profiles.id],
  }),
  progress: many(moduleProgress),
  plagiarismCheck: one(plagiarismChecks),
  plagiarismMatches: many(plagiarismMatches),
  plagiarismOverrides: many(plagiarismOverrides),
}));

export const plagiarismCheckRelations = relations(plagiarismChecks, ({ one, many }) => ({
  submission: one(submissions, {
    fields: [plagiarismChecks.submissionId],
    references: [submissions.id],
  }),
  matches: many(plagiarismMatches),
  overrides: many(plagiarismOverrides),
}));

export const plagiarismMatchRelations = relations(plagiarismMatches, ({ one }) => ({
  check: one(plagiarismChecks, {
    fields: [plagiarismMatches.checkId],
    references: [plagiarismChecks.id],
  }),
  matchedSubmission: one(submissions, {
    fields: [plagiarismMatches.matchedSubmissionId],
    references: [submissions.id],
  }),
}));

export const plagiarismOverrideRelations = relations(plagiarismOverrides, ({ one }) => ({
  actor: one(profiles, {
    fields: [plagiarismOverrides.actorId],
    references: [profiles.id],
  }),
  check: one(plagiarismChecks, {
    fields: [plagiarismOverrides.checkId],
    references: [plagiarismChecks.id],
  }),
  submission: one(submissions, {
    fields: [plagiarismOverrides.submissionId],
    references: [submissions.id],
  }),
}));

export const moduleProgressRelations = relations(moduleProgress, ({ one }) => ({
  class: one(classes, {
    fields: [moduleProgress.classId],
    references: [classes.id],
  }),
  step: one(moduleSteps, {
    fields: [moduleProgress.moduleStepId],
    references: [moduleSteps.id],
  }),
  student: one(profiles, {
    fields: [moduleProgress.studentId],
    references: [profiles.id],
  }),
  submission: one(submissions, {
    fields: [moduleProgress.submissionId],
    references: [submissions.id],
  }),
}));

export const certificateRelations = relations(certificates, ({ one }) => ({
  class: one(classes, {
    fields: [certificates.classId],
    references: [classes.id],
  }),
  student: one(profiles, {
    fields: [certificates.studentId],
    references: [profiles.id],
  }),
}));

export const certificateVerificationRelations = relations(certificateVerifications, ({ one }) => ({
  certificate: one(certificates, {
    fields: [certificateVerifications.certificateId],
    references: [certificates.id],
  }),
}));

export const exportRelations = relations(exports, ({ one }) => ({
  class: one(classes, {
    fields: [exports.classId],
    references: [classes.id],
  }),
  requester: one(profiles, {
    fields: [exports.requestedBy],
    references: [profiles.id],
  }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  recipient: one(profiles, {
    fields: [notifications.recipientId],
    references: [profiles.id],
  }),
}));
