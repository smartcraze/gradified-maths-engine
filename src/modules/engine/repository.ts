import { prisma } from "@/config/prisma";

export async function getSubmissionForEvaluation(submissionId: string) {
  return prisma.studentSubmission.findUnique({
    where: {
      id: submissionId,
    },
    include: {
      exam: true,
      evaluation: true,
    },
  });
}
