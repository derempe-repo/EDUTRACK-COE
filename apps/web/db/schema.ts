import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", [
  "mahasiswa",
  "dosen",
  "admin",
  "super_admin",
]);

export const userStatus = pgEnum("user_status", ["active", "inactive"]);
export const classStatus = pgEnum("class_status", ["draft", "published", "archived"]);
export const memberRole = pgEnum("member_role", ["student", "lecturer", "assistant"]);
export const materialType = pgEnum("material_type", ["pdf", "video", "slide", "link", "file"]);
export const progressStatus = pgEnum("progress_status", [
  "not_started",
  "in_progress",
  "submitted",
  "verified",
  "failed",
  "locked",
]);
export const submissionStatus = pgEnum("submission_status", [
  "draft",
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "locked",
  "resubmit_allowed",
]);
export const plagiarismStatus = pgEnum("plagiarism_status", [
  "pending",
  "passed",
  "flagged",
  "needs_review",
  "rejected_permanent",
  "resubmit_allowed",
]);
export const quizAttemptStatus = pgEnum("quiz_attempt_status", [
  "started",
  "submitted",
  "reset",
  "expired",
]);
export const certificateStatus = pgEnum("certificate_status", ["draft", "issued", "revoked"]);
export const notificationStatus = pgEnum("notification_status", ["unread", "read"]);
export const forumThreadStatus = pgEnum("forum_thread_status", ["open", "answered", "closed"]);
export const exportStatus = pgEnum("export_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export type SystemSettingValue =
  | string
  | number
  | boolean
  | null
  | SystemSettingValue[]
  | { [key: string]: SystemSettingValue };

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("active"),
    avatarUrl: text("avatar_url"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("profiles_email_unique").on(table.email),
    index("profiles_role_idx").on(table.role),
    index("profiles_created_at_idx").on(table.createdAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_actor_id_idx").on(table.actorId),
    index("audit_logs_actor_role_created_at_idx").on(table.actorRole, table.createdAt),
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_action_idx").on(table.action),
  ],
);

export const systemSettings = pgTable(
  "system_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    value: jsonb("value").$type<SystemSettingValue>().notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(false),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("system_settings_key_unique").on(table.key),
    index("system_settings_is_public_idx").on(table.isPublic),
    index("system_settings_updated_by_idx").on(table.updatedBy),
  ],
);

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    status: classStatus("status").notNull().default("draft"),
    assignmentWeight: integer("assignment_weight").notNull().default(30),
    quizWeight: integer("quiz_weight").notNull().default(30),
    finalExamWeight: integer("final_exam_weight").notNull().default(40),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("classes_created_by_idx").on(table.createdBy),
    index("classes_status_idx").on(table.status),
  ],
);

export const classMembers = pgTable(
  "class_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("class_members_class_profile_unique").on(table.classId, table.profileId),
    index("class_members_class_id_idx").on(table.classId),
    index("class_members_profile_id_idx").on(table.profileId),
    index("class_members_role_idx").on(table.role),
  ],
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isLocked: boolean("is_locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("modules_class_id_idx").on(table.classId),
    index("modules_sort_order_idx").on(table.sortOrder),
  ],
);

export const moduleSteps = pgTable(
  "module_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isRequired: boolean("is_required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("module_steps_module_id_idx").on(table.moduleId),
    index("module_steps_sort_order_idx").on(table.sortOrder),
  ],
);

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleStepId: uuid("module_step_id")
      .notNull()
      .references(() => moduleSteps.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: materialType("type").notNull().default("link"),
    url: text("url"),
    storagePath: text("storage_path"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("materials_module_step_id_idx").on(table.moduleStepId),
    index("materials_type_idx").on(table.type),
    index("materials_sort_order_idx").on(table.sortOrder),
    index("materials_created_by_idx").on(table.createdBy),
  ],
);

export const materialReads = pgTable(
  "material_reads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("material_reads_material_student_unique").on(table.materialId, table.studentId),
    index("material_reads_material_id_idx").on(table.materialId),
    index("material_reads_student_id_idx").on(table.studentId),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleStepId: uuid("module_step_id")
      .notNull()
      .references(() => moduleSteps.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    attachmentStoragePath: text("attachment_storage_path"),
    attachmentFileName: text("attachment_file_name"),
    attachmentFileSize: integer("attachment_file_size"),
    attachmentMimeType: text("attachment_mime_type"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    maxScore: integer("max_score").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("assignments_module_step_id_idx").on(table.moduleStepId),
    index("assignments_created_by_idx").on(table.createdBy),
    index("assignments_due_at_idx").on(table.dueAt),
    index("assignments_is_active_idx").on(table.isActive),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: submissionStatus("status").notNull().default("submitted"),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    note: text("note"),
    score: integer("score"),
    feedback: text("feedback"),
    plagiarismStatus: plagiarismStatus("plagiarism_status").notNull().default("pending"),
    submissionText: text("submission_text"),
    fileHash: text("file_hash"),
    textHash: text("text_hash"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("submissions_assignment_student_unique").on(table.assignmentId, table.studentId),
    index("submissions_assignment_id_idx").on(table.assignmentId),
    index("submissions_assignment_submitted_at_idx").on(table.assignmentId, table.submittedAt),
    index("submissions_student_id_idx").on(table.studentId),
    index("submissions_status_idx").on(table.status),
    index("submissions_plagiarism_status_idx").on(table.plagiarismStatus),
    index("submissions_reviewed_by_idx").on(table.reviewedBy),
  ],
);

export const plagiarismChecks = pgTable(
  "plagiarism_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    status: plagiarismStatus("status").notNull().default("pending"),
    similarityScore: integer("similarity_score").notNull().default(0),
    thresholdPercent: integer("threshold_percent").notNull().default(70),
    detectionMethod: text("detection_method").notNull().default("none"),
    extractionStatus: text("extraction_status").notNull().default("pending"),
    extractionError: text("extraction_error"),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("plagiarism_checks_submission_id_unique").on(table.submissionId),
    index("plagiarism_checks_status_idx").on(table.status),
    index("plagiarism_checks_status_checked_at_idx").on(table.status, table.checkedAt),
    index("plagiarism_checks_similarity_score_idx").on(table.similarityScore),
    index("plagiarism_checks_checked_at_idx").on(table.checkedAt),
  ],
);

export const plagiarismMatches = pgTable(
  "plagiarism_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkId: uuid("check_id")
      .notNull()
      .references(() => plagiarismChecks.id, { onDelete: "cascade" }),
    matchedSubmissionId: uuid("matched_submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    similarityScore: integer("similarity_score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("plagiarism_matches_check_submission_unique").on(
      table.checkId,
      table.matchedSubmissionId,
    ),
    index("plagiarism_matches_check_id_idx").on(table.checkId),
    index("plagiarism_matches_matched_submission_id_idx").on(table.matchedSubmissionId),
    index("plagiarism_matches_similarity_score_idx").on(table.similarityScore),
  ],
);

export const plagiarismOverrides = pgTable(
  "plagiarism_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkId: uuid("check_id")
      .notNull()
      .references(() => plagiarismChecks.id, { onDelete: "cascade" }),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    reason: text("reason").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("plagiarism_overrides_check_id_idx").on(table.checkId),
    index("plagiarism_overrides_submission_id_idx").on(table.submissionId),
    index("plagiarism_overrides_actor_id_idx").on(table.actorId),
    index("plagiarism_overrides_created_at_idx").on(table.createdAt),
  ],
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleStepId: uuid("module_step_id").references(() => moduleSteps.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").references(() => modules.id, { onDelete: "cascade" }),
    quizType: text("quiz_type").notNull().default("step"),
    title: text("title").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    questionCount: integer("question_count").notNull().default(5),
    passingScore: integer("passing_score").notNull().default(70),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("quizzes_active_step_unique")
      .on(table.moduleStepId)
      .where(sql`${table.isActive} = true and ${table.quizType} = 'step'`),
    uniqueIndex("quizzes_active_final_module_unique")
      .on(table.moduleId)
      .where(sql`${table.isActive} = true and ${table.quizType} = 'final'`),
    index("quizzes_module_step_id_idx").on(table.moduleStepId),
    index("quizzes_module_id_idx").on(table.moduleId),
    index("quizzes_quiz_type_idx").on(table.quizType),
    index("quizzes_created_by_idx").on(table.createdBy),
    index("quizzes_is_active_idx").on(table.isActive),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleStepId: uuid("module_step_id")
      .notNull()
      .references(() => moduleSteps.id, { onDelete: "cascade" }),
    questionText: text("question_text").notNull(),
    difficulty: text("difficulty").notNull().default("medium"),
    weight: integer("weight").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("questions_module_step_id_idx").on(table.moduleStepId),
    index("questions_created_by_idx").on(table.createdBy),
    index("questions_difficulty_idx").on(table.difficulty),
    index("questions_is_active_idx").on(table.isActive),
  ],
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("question_options_question_id_idx").on(table.questionId),
    uniqueIndex("question_options_question_label_unique").on(table.questionId, table.label),
  ],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: quizAttemptStatus("status").notNull().default("started"),
    score: integer("score"),
    totalWeight: integer("total_weight").notNull().default(0),
    correctWeight: integer("correct_weight").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quiz_attempts_quiz_id_idx").on(table.quizId),
    index("quiz_attempts_quiz_started_at_idx").on(table.quizId, table.startedAt),
    index("quiz_attempts_student_id_idx").on(table.studentId),
    index("quiz_attempts_student_quiz_started_at_idx").on(table.studentId, table.quizId, table.startedAt),
    index("quiz_attempts_student_started_at_idx").on(table.studentId, table.startedAt),
    index("quiz_attempts_status_idx").on(table.status),
  ],
);

export const quizAttemptQuestions = pgTable(
  "quiz_attempt_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    questionText: text("question_text").notNull(),
    weight: integer("weight").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quiz_attempt_questions_attempt_id_idx").on(table.attemptId),
    index("quiz_attempt_questions_question_id_idx").on(table.questionId),
    uniqueIndex("quiz_attempt_questions_attempt_question_unique").on(table.attemptId, table.questionId),
  ],
);

export const quizAnswers = pgTable(
  "quiz_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptQuestionId: uuid("attempt_question_id")
      .notNull()
      .references(() => quizAttemptQuestions.id, { onDelete: "cascade" }),
    selectedOptionId: uuid("selected_option_id").references(() => questionOptions.id, {
      onDelete: "set null",
    }),
    isCorrect: boolean("is_correct").notNull().default(false),
    weightAwarded: integer("weight_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("quiz_answers_attempt_question_unique").on(table.attemptQuestionId),
    index("quiz_answers_selected_option_id_idx").on(table.selectedOptionId),
  ],
);

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("grades_student_source_unique").on(table.studentId, table.sourceType, table.sourceId),
    index("grades_class_id_idx").on(table.classId),
    index("grades_student_id_idx").on(table.studentId),
  ],
);

export const examModeEvents = pgTable(
  "exam_mode_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exam_mode_events_attempt_id_idx").on(table.attemptId),
    index("exam_mode_events_attempt_created_at_idx").on(table.attemptId, table.createdAt),
    index("exam_mode_events_student_id_idx").on(table.studentId),
    index("exam_mode_events_event_type_idx").on(table.eventType),
    index("exam_mode_events_created_at_idx").on(table.createdAt),
  ],
);

export const moduleProgress = pgTable(
  "module_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    moduleStepId: uuid("module_step_id")
      .notNull()
      .references(() => moduleSteps.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "set null" }),
    status: progressStatus("status").notNull().default("not_started"),
    score: integer("score"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("module_progress_step_student_unique").on(table.moduleStepId, table.studentId),
    index("module_progress_class_id_idx").on(table.classId),
    index("module_progress_student_id_idx").on(table.studentId),
    index("module_progress_status_idx").on(table.status),
    index("module_progress_submission_id_idx").on(table.submissionId),
  ],
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: certificateStatus("status").notNull().default("draft"),
    eligibleAt: timestamp("eligible_at", { withTimezone: true }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    certificateNumber: text("certificate_number"),
    verificationToken: text("verification_token"),
    pdfStoragePath: text("pdf_storage_path"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("certificates_class_student_unique").on(table.classId, table.studentId),
    uniqueIndex("certificates_verification_token_unique")
      .on(table.verificationToken)
      .where(sql`${table.verificationToken} is not null`),
    index("certificates_class_id_idx").on(table.classId),
    index("certificates_student_id_idx").on(table.studentId),
    index("certificates_status_idx").on(table.status),
  ],
);

export const certificateVerifications = pgTable(
  "certificate_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    certificateId: uuid("certificate_id").references(() => certificates.id, { onDelete: "set null" }),
    verificationToken: text("verification_token").notNull(),
    result: text("result").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("certificate_verifications_certificate_id_idx").on(table.certificateId),
    index("certificate_verifications_verified_at_idx").on(table.verifiedAt),
  ],
);

export const exports = pgTable(
  "exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    status: exportStatus("status").notNull().default("pending"),
    fileName: text("file_name"),
    fileStoragePath: text("file_storage_path"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exports_class_id_idx").on(table.classId),
    index("exports_class_created_at_idx").on(table.classId, table.createdAt),
    index("exports_requested_by_idx").on(table.requestedBy),
    index("exports_status_idx").on(table.status),
    index("exports_created_at_idx").on(table.createdAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: notificationStatus("status").notNull().default("unread"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    index("notifications_recipient_id_idx").on(table.recipientId),
    index("notifications_recipient_created_at_idx").on(table.recipientId, table.createdAt),
    index("notifications_status_idx").on(table.status),
    index("notifications_created_at_idx").on(table.createdAt),
  ],
);
