type ClassStatus = "archived" | "draft" | "published";
type ProfileRole = "admin" | "dosen" | "mahasiswa" | "super_admin";
type SubmissionStatus =
  | "accepted"
  | "draft"
  | "locked"
  | "rejected"
  | "resubmit_allowed"
  | "submitted"
  | "under_review";
type ProgressStatus = "failed" | "in_progress" | "locked" | "not_started" | "submitted" | "verified";

type AssignmentAccessInput = {
  assignmentIsActive: boolean;
  classStatus: ClassStatus;
  isClassMember: boolean;
  isClassOwner: boolean;
  moduleIsLocked: boolean;
  profileRole: ProfileRole;
};

export function canViewAssignment({
  assignmentIsActive,
  classStatus,
  isClassMember,
  isClassOwner,
  moduleIsLocked,
  profileRole,
}: AssignmentAccessInput) {
  if (profileRole === "admin" || profileRole === "super_admin" || isClassOwner) {
    return true;
  }

  if (profileRole !== "mahasiswa" || !isClassMember) {
    return false;
  }

  return classStatus === "published" && !moduleIsLocked && assignmentIsActive;
}

export function canSubmitAssignment(input: AssignmentAccessInput) {
  return input.profileRole === "mahasiswa" && canViewAssignment(input);
}

export function canReviewSubmission({
  isClassOwner,
  profileRole,
}: {
  isClassOwner: boolean;
  profileRole: ProfileRole;
}) {
  return profileRole === "admin" || profileRole === "super_admin" || isClassOwner;
}

export function canStudentReplaceSubmission(status: SubmissionStatus | null) {
  return status === null || status === "rejected" || status === "resubmit_allowed";
}

export function progressStatusFromSubmission(status: SubmissionStatus): ProgressStatus {
  if (status === "accepted") {
    return "verified";
  }

  if (status === "rejected") {
    return "failed";
  }

  if (status === "resubmit_allowed") {
    return "in_progress";
  }

  if (status === "locked") {
    return "locked";
  }

  if (status === "submitted" || status === "under_review") {
    return "submitted";
  }

  return "not_started";
}
