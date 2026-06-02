export type ProviderContext = {
  classId: string;
  studentId: string;
};

export interface VideoMeetingProvider {
  createMeeting(input: { classId: string; title: string }): Promise<{ joinUrl: string }>;
}

export interface AcademicSystemProvider {
  syncCompletion(input: ProviderContext & { certificateNumber: string; finalScore: number }): Promise<void>;
}

export interface OutboundNotificationProvider {
  send(input: { body: string; recipientId: string; title: string }): Promise<void>;
}

export interface BlockchainAnchorProvider {
  anchorCertificate(input: { certificateId: string; hash: string }): Promise<{ transactionId: string }>;
}

export interface SimilarityProvider {
  checkSubmission(input: { filePath: string; submissionId: string }): Promise<{ score: number }>;
}
